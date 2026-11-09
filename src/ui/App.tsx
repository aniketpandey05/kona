import { useEffect, useRef, useState } from 'preact/hooks';
import type { KonaController, NoteCardState, SearchState, ViewState } from '../content/controller';
import { HIGHLIGHT_COLORS, UI_COLORS } from '../core/painter';
import { siteLabel } from '../core/sites';
import { addTags, removeTag } from '../core/tags';
import { MarkBar, SelectionBar } from './Bar';
import { Panel } from './Panel';
import type { HighlightColor, Mark } from '../core/types';

const COLORS = Object.keys(HIGHLIGHT_COLORS) as HighlightColor[];
const MAX_NOTE_LENGTH = 1000;
interface Props {
  controller: KonaController;
}

export function App({ controller }: Props) {
  const state = useViewState(controller);
  if (!state.enabled || !state.conversationId) return null;
  const cardMark = state.card && state.items.find((item) => item.mark.id === state.card?.markId)?.mark;
  return (
    <div class={state.dark ? 'k-root k-dark' : 'k-root'}>
      {state.selection && <SelectionBar selection={state.selection} controller={controller} />}
      <Panel state={state} controller={controller} />
      {/* 10c: a tap gives the bar; the bar's Note button is what opens the
          editor. focusNote is the controller already saying which was asked for. */}
      {state.card &&
        cardMark &&
        (state.card.focusNote ? (
          <NoteCard key={cardMark.id} card={state.card} mark={cardMark} controller={controller} />
        ) : (
          <MarkBar
            card={state.card}
            mark={cardMark}
            controller={controller}
            inSpace={
              state.activeSpace?.items.some((each) => each.id === cardMark.id)
                ? state.activeSpace.name
                : undefined
            }
          />
        ))}
      <Minimap state={state} controller={controller} />
      {state.search && <SearchPalette search={state.search} controller={controller} />}
      {state.undo && (
        <div class="k-undo" role="status">
          <span class="k-undo-text">Deleted “{state.undo.label}”</span>
          <button class="k-undo-button" onClick={() => controller.undoDelete()}>
            Undo
          </button>
        </div>
      )}
      {state.notice && (
        <div class="k-notice" role="status">
          {state.notice}
        </div>
      )}
    </div>
  );
}

function useViewState(controller: KonaController): ViewState {
  const [state, setState] = useState(controller.getState());
  useEffect(() => {
    setState(controller.getState());
    return controller.subscribe(() => setState(controller.getState()));
  }, [controller]);
  return state;
}


function NoteCard({ card, mark, controller }: Props & { card: NoteCardState; mark: Mark }) {
  const [note, setNote] = useState(mark.note ?? '');
  const cardRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const tags = mark.tags ?? [];

  // Read the box itself, so a tag typed and confirmed in one go can't be missed.
  const addTag = () => {
    const typed = tagInputRef.current?.value ?? '';
    if (tagInputRef.current) tagInputRef.current.value = '';
    const next = addTags(tags, typed);
    if (next.length !== tags.length) void controller.updateMark(mark.id, { tags: next });
  };

  // Read the textarea itself so a save never sees an older render's value.
  const save = () => void controller.saveNote(mark.id, textareaRef.current?.value ?? note);

  useEffect(() => {
    if (card.focusNote) textareaRef.current?.focus({ preventScroll: true });
  }, []);

  // Clicking anywhere else keeps what was typed instead of throwing it away.
  useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      if (cardRef.current && !event.composedPath().includes(cardRef.current)) save();
    };
    window.addEventListener('mousedown', onMouseDown, true);
    return () => window.removeEventListener('mousedown', onMouseDown, true);
  }, [controller, mark.id]);

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      controller.closeCard();
    } else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      save();
    }
  };

  return (
    <div
      ref={cardRef}
      class={card.position ? 'k-card' : 'k-card k-card-docked'}
      style={card.position ? { top: `${card.position.top}px`, left: `${card.position.left}px` } : undefined}
      role="dialog"
      aria-label="Highlight note"
      onKeyDown={onKeyDown}
    >
      <div class="k-card-header">
        <div class="k-card-colors">
          {COLORS.map((color) => (
            <button
              key={color}
              class={color === mark.color ? 'k-dot k-dot-active' : 'k-dot'}
              style={{ background: HIGHLIGHT_COLORS[color] }}
              aria-label={`Change color to ${color}`}
              aria-pressed={color === mark.color}
              onClick={() => void controller.updateMark(mark.id, { color })}
            />
          ))}
        </div>
        <button class="k-text-button k-danger" onClick={() => void controller.remove(mark.id)}>
          Delete
        </button>
      </div>
      {/* Without a highlight on screen to sit next to, show what the note is about. */}
      {!card.position && <p class="k-card-quote">{mark.snapshot}</p>}
      <textarea
        ref={textareaRef}
        class="k-textarea"
        value={note}
        maxLength={MAX_NOTE_LENGTH}
        rows={3}
        placeholder="Add a note…"
        aria-label="Note"
        onInput={(event) => setNote(event.currentTarget.value)}
      />
      <div class="k-tags">
        {tags.map((tag) => (
          <button
            key={tag}
            class="k-tag"
            title={`Remove "${tag}"`}
            onClick={() => void controller.updateMark(mark.id, { tags: removeTag(tags, tag) })}
          >
            {tag} <span aria-hidden="true">✕</span>
          </button>
        ))}
        <input
          ref={tagInputRef}
          class="k-tag-input"
          type="text"
          placeholder={tags.length ? 'Add another tag…' : 'Add a tag…'}
          aria-label="Add a tag"
          onBlur={addTag}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' && event.key !== ',') return;
            event.preventDefault();
            addTag();
          }}
        />
      </div>
      <div class="k-card-footer">
        <span class="k-hint">Ctrl+Enter to save · Esc to cancel</span>
        <button class="k-primary-button" onClick={save}>
          Save
        </button>
      </div>
    </div>
  );
}

/** Ticks beside the scrollbar showing where the highlights are on this page. */
function Minimap({ state, controller }: Props & { state: ViewState }) {
  if (state.ticks.length === 0) return null;
  return (
    <div class="k-minimap" aria-label="Highlights on this page">
      {state.viewport && (
        <span
          class="k-minimap-view"
          style={{ top: `${state.viewport.top * 100}%`, height: `${state.viewport.height * 100}%` }}
        />
      )}
      {state.ticks.map((tick) => (
        <button
          key={tick.id}
          class="k-tick"
          style={{ top: `${tick.at * 100}%`, background: UI_COLORS[tick.color] }}
          title={tick.label}
          aria-label={`Go to highlight: ${tick.label}`}
          onClick={() => controller.jump(tick.id)}
        />
      ))}
    </div>
  );
}

function SearchPalette({ search, controller }: Props & { search: SearchState }) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  const onKeyDown = (event: KeyboardEvent) => {
    const keys: Record<string, () => void> = {
      Escape: () => controller.closeSearch(),
      ArrowDown: () => controller.moveSearch(1),
      ArrowUp: () => controller.moveSearch(-1),
      Enter: () => controller.openSearchResult(),
    };
    const action = keys[event.key];
    if (!action) return;
    event.preventDefault();
    action();
  };

  return (
    <div
      class="k-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) controller.closeSearch();
      }}
    >
      <div class="k-palette" role="dialog" aria-label="Search your highlights" onKeyDown={onKeyDown}>
        <input
          ref={inputRef}
          class="k-palette-input"
          type="text"
          value={search.query}
          placeholder="Search everything you've highlighted…"
          aria-label="Search your highlights"
          onInput={(event) => controller.searchFor(event.currentTarget.value)}
        />
        {search.alsoMatched.length > 0 && (
          <p class="k-palette-also">
            Also matched {search.alsoMatched.join(' · ')}, words your own highlights keep
            beside what you typed.
          </p>
        )}
        {search.results.length === 0 ? (
          <p class="k-empty">Nothing matches that.</p>
        ) : (
          <ul class="k-palette-list">
            {search.results.map((mark, index) => (
              <li key={mark.id}>
                <button
                  class={index === search.active ? 'k-palette-item k-palette-on' : 'k-palette-item'}
                  onMouseEnter={() => controller.moveSearchTo(index)}
                  onClick={() => controller.openSearchResult(mark)}
                >
                  <span class="k-palette-site">{siteLabel(mark)}</span>
                  <span class="k-item-body">
                    <span class="k-text">{mark.snapshot}</span>
                    {mark.note && <span class="k-note">{mark.note}</span>}
                  </span>
                  <span class="k-palette-chat">{mark.conversationTitle}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <p class="k-palette-footer">↑↓ to choose · Enter to open · Esc to close</p>
      </div>
    </div>
  );
}

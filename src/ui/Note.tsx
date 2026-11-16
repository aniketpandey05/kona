import { useEffect, useRef, useState } from 'preact/hooks';
import type { KonaController, NoteCardState } from '../content/controller';
import { addTags, removeTag } from '../core/tags';
import type { Mark } from '../core/types';

/**
 * Your note on one highlight, and its tags.
 *
 * It is reached from the bar's **Note** button and nowhere else (10c), which
 * is why it carries neither the pens nor Delete: the bar has both, you were
 * just looking at them, and repeating them here would be the same control in
 * two places disagreeing about which one you pressed.
 *
 * What it is for, in one line from DEFINITIONS: a note is what *you* thought
 * and the highlight is what the *page* said, and the two are never mixed
 * together. So the editor says so: the passage above, your words below, and
 * the accent edge between them, exactly as the passage core draws it.
 */
const MAX_NOTE = 1000;

export function Note({
  card,
  mark,
  controller,
}: {
  card: NoteCardState;
  mark: Mark;
  controller: KonaController;
}) {
  const [note, setNote] = useState(mark.note ?? '');
  const box = useRef<HTMLDivElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const tagBox = useRef<HTMLInputElement>(null);
  const tags = mark.tags ?? [];

  // Read the box itself, so a tag typed and confirmed in one go is not missed.
  const addTag = () => {
    const typed = tagBox.current?.value ?? '';
    if (tagBox.current) tagBox.current.value = '';
    const next = addTags(tags, typed);
    if (next.length !== tags.length) void controller.updateMark(mark.id, { tags: next });
  };

  // Read the textarea itself, so a save never writes an older render's value.
  const save = () => void controller.saveNote(mark.id, area.current?.value ?? note);

  useEffect(() => {
    area.current?.focus({ preventScroll: true });
  }, []);

  // Clicking away keeps what was typed rather than throwing it out. Losing a
  // sentence because you looked at the page it was about would be the worst
  // small failure this screen has available.
  useEffect(() => {
    const onDown = (event: MouseEvent) => {
      if (box.current && !event.composedPath().includes(box.current)) save();
    };
    window.addEventListener('mousedown', onDown, true);
    return () => window.removeEventListener('mousedown', onDown, true);
  }, [controller, mark.id]);

  return (
    <div
      ref={box}
      class={card.position ? 'kona-note' : 'kona-note kona-note--docked'}
      // Custom properties, not top and left, so the phone rule can move the
      // card to the foot of the screen without an inline style outranking it.
      style={
        card.position
          ? ({
              '--kona-note-top': `${card.position.top}px`,
              '--kona-note-left': `${card.position.left}px`,
            } as never)
          : undefined
      }
      role="dialog"
      aria-label="Your note"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          controller.closeCard();
        } else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          save();
        }
      }}
    >
      {/* With no highlight on screen to sit beside, say what the note is about. */}
      {!card.position && <p class="kona-note-quote">{mark.snapshot}</p>}

      <textarea
        ref={area}
        class="kona-note-text"
        value={note}
        maxLength={MAX_NOTE}
        rows={3}
        placeholder="What you thought…"
        aria-label="Note"
        onInput={(event) => setNote(event.currentTarget.value)}
      />

      {/* A tag is a property of a highlight, the way a colour is, and does not
          compete with spaces: neither implies the other (DEFINITIONS, Tag). */}
      <div class="kona-note-tags">
        {tags.map((tag) => (
          <button
            key={tag}
            type="button"
            class="kona-note-tag"
            title={`Remove "${tag}"`}
            onClick={() => void controller.updateMark(mark.id, { tags: removeTag(tags, tag) })}
          >
            {tag} <span aria-hidden="true">✕</span>
          </button>
        ))}
        <input
          ref={tagBox}
          class="kona-note-tag-input"
          type="text"
          placeholder={tags.length ? 'Another tag…' : 'Add a tag…'}
          aria-label="Add a tag"
          onBlur={addTag}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' && event.key !== ',') return;
            event.preventDefault();
            addTag();
          }}
        />
      </div>

      <div class="kona-note-foot">
        <span class="kona-note-hint">Ctrl+Enter to save · Esc to close</span>
        <button type="button" class="kona-note-save" onClick={save}>
          Save
        </button>
      </div>
    </div>
  );
}

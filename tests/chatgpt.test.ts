import { beforeEach, describe, expect, it } from 'vitest';
import { chatgptAdapter as adapter } from '../src/adapters/chatgpt';

const render = (html: string) => {
  document.body.innerHTML = html;
};

beforeEach(() => {
  document.body.innerHTML = '';
  document.title = 'ChatGPT';
});

describe('conversation id', () => {
  it('reads a normal chat url', () => {
    expect(adapter.getConversationId(new URL('https://chatgpt.com/c/abc-123'))).toBe('abc-123');
  });

  it('reads a project chat url', () => {
    expect(adapter.getConversationId(new URL('https://chatgpt.com/g/g-p-xyz/c/abc-123'))).toBe('abc-123');
  });

  // Losing the id entirely hides the extension, so an unfamiliar path still
  // produces something stable to group by.
  it('falls back to the path when the url shape changes', () => {
    expect(adapter.getConversationId(new URL('https://chatgpt.com/chat/abc-123'))).toBe('/chat/abc-123');
  });

  it('is nothing at the site root', () => {
    expect(adapter.getConversationId(new URL('https://chatgpt.com/'))).toBeNull();
  });
});

describe('finding messages', () => {
  it('reads author and id from data attributes', () => {
    render(`
      <div data-message-author-role="user" data-message-id="m1"><div class="whitespace-pre-wrap">hi</div></div>
      <div data-message-author-role="assistant" data-message-id="m2"><div class="markdown">hello</div></div>
    `);
    const messages = adapter.getMessages();
    expect(messages.map((m) => m.role)).toEqual(['user', 'assistant']);
    expect(messages.map((m) => m.messageId)).toEqual(['m1', 'm2']);
    expect(adapter.getContentRoot(messages[1]!).textContent).toBe('hello');
  });

  it('skips system and tool messages', () => {
    render(`
      <div data-message-author-role="system">setup</div>
      <div data-message-author-role="user">hi</div>
    `);
    expect(adapter.getMessages().map((m) => m.role)).toEqual(['user']);
  });

  it('falls back to turn markup when the author attribute is gone', () => {
    render(`
      <article data-turn="user" data-turn-id="t1">hi</article>
      <article data-turn="assistant" data-turn-id="t2">hello</article>
    `);
    const messages = adapter.getMessages();
    expect(messages.map((m) => m.role)).toEqual(['user', 'assistant']);
    expect(messages.map((m) => m.messageId)).toEqual(['t1', 't2']);
  });

  it('falls back to conversation turns, inferring the author from the turn number', () => {
    render(`
      <div data-testid="conversation-turn-0">hi</div>
      <div data-testid="conversation-turn-1">hello</div>
    `);
    expect(adapter.getMessages().map((m) => m.role)).toEqual(['user', 'assistant']);
  });

  it('prefers the first strategy that finds anything', () => {
    render(`
      <article data-turn="user" data-turn-id="t1">
        <div data-message-author-role="user" data-message-id="m1">hi</div>
      </article>
    `);
    expect(adapter.getMessages().map((m) => m.messageId)).toEqual(['m1']);
  });

  it('is empty when the page holds no conversation at all', () => {
    render('<main>Nothing here</main>');
    expect(adapter.getMessages()).toEqual([]);
  });
});

describe('streaming', () => {
  const conversation = (extra = '') => render(`
    <div data-message-author-role="user" data-message-id="m1">hi</div>
    <div data-message-author-role="assistant" data-message-id="m2">one</div>
    <div data-message-author-role="assistant" data-message-id="m3">two</div>
    ${extra}
  `);

  it('is quiet when nothing is being written', () => {
    conversation();
    expect(adapter.isStreaming(adapter.getMessages()[2]!)).toBe(false);
  });

  it('only the newest reply is streaming', () => {
    conversation('<button data-testid="stop-button">Stop</button>');
    const messages = adapter.getMessages();
    expect(adapter.isStreaming(messages[2]!)).toBe(true);
    expect(adapter.isStreaming(messages[1]!)).toBe(false);
  });

  it('recognises the stop button by its label when the test id changes', () => {
    conversation('<button aria-label="Stop generating">■</button>');
    expect(adapter.isStreaming(adapter.getMessages()[2]!)).toBe(true);
  });
});

describe('title', () => {
  it('drops the site name', () => {
    document.title = 'Docker setup help - ChatGPT';
    expect(adapter.getConversationTitle()).toBe('Docker setup help');
  });

  it('names an untitled chat', () => {
    document.title = 'ChatGPT';
    expect(adapter.getConversationTitle()).toBe('Untitled chat');
  });
});

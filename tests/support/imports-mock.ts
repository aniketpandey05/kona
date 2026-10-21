// Stand-ins for the parts of WXT's runtime the extension uses, so it can run on a plain web page.
type Listener = (value: unknown) => void;
type ChangeListener = (changes: Record<string, unknown>, area: string) => void;

const watchers = new Map<string, Set<Listener>>();
const changeListeners = new Set<ChangeListener>();
// Extension storage keys have no area prefix, so drop it the way WXT does.
const plainKey = (key: string) => key.replace(/^(local|session|sync|managed):/, '');

export const storage = {
  async getItem<T>(key: string): Promise<T | null> {
    const raw = localStorage.getItem(plainKey(key));
    return raw === null ? null : (JSON.parse(raw) as T);
  },
  async setItem(key: string, value: unknown): Promise<void> {
    localStorage.setItem(plainKey(key), JSON.stringify(value));
    watchers.get(key)?.forEach((listener) => listener(value));
    changeListeners.forEach((listener) => listener({ [plainKey(key)]: { newValue: value } }, 'local'));
  },
  watch<T>(key: string, callback: (value: T | null) => void): () => void {
    const listener = callback as Listener;
    if (!watchers.has(key)) watchers.set(key, new Set());
    watchers.get(key)!.add(listener);
    return () => watchers.get(key)?.delete(listener);
  },
};

export const browser = {
  runtime: {
    async sendMessage(message: unknown) {
      console.info('[harness] runtime.sendMessage', message);
      return null;
    },
    onMessage: { addListener(_listener: unknown) {}, removeListener(_listener: unknown) {} },
  },
  storage: {
    local: {
      async get(): Promise<Record<string, unknown>> {
        const everything: Record<string, unknown> = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)!;
          try {
            everything[key] = JSON.parse(localStorage.getItem(key)!);
          } catch {
            // Not ours; skip anything that isn't JSON.
          }
        }
        return everything;
      },
    },
    onChanged: {
      addListener: (listener: ChangeListener) => changeListeners.add(listener),
      removeListener: (listener: ChangeListener) => changeListeners.delete(listener),
    },
  },
};

interface UiOptions<T> {
  name: string;
  onMount: (container: HTMLElement) => T;
  onRemove?: (mounted: T | undefined) => void;
}

export async function createShadowRootUi<T>(_ctx: unknown, options: UiOptions<T>) {
  const host = document.createElement(options.name);
  const shadow = host.attachShadow({ mode: 'open' });
  const container = document.createElement('div');
  shadow.append(container);
  // Same default as WXT's isolateEvents: keyboard events don't escape the shadow root.
  for (const type of ['keydown', 'keyup', 'keypress']) {
    host.addEventListener(type, (event) => event.stopPropagation());
  }

  let mounted: T | undefined;
  return {
    mount() {
      document.body.append(host);
      mounted = options.onMount(container);
    },
    remove() {
      options.onRemove?.(mounted);
      host.remove();
    },
  };
}

export function createHarnessContext() {
  return {
    isInvalid: false,
    onInvalidated(_callback: () => void) {},
    setTimeout: (callback: () => void, ms: number) => window.setTimeout(callback, ms),
    addEventListener(
      target: EventTarget,
      type: string,
      handler: (event: any) => void,
      options?: AddEventListenerOptions,
    ) {
      if (type !== 'wxt:locationchange') {
        target.addEventListener(type, handler, options);
        return;
      }
      // WXT detects SPA navigation by polling the URL; do the same.
      let last = location.href;
      window.setInterval(() => {
        if (location.href === last) return;
        const oldUrl = new URL(last);
        last = location.href;
        handler({ newUrl: new URL(last), oldUrl });
      }, 300);
    },
  };
}

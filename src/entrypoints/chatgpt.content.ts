import { chatgptAdapter } from '../adapters/chatgpt';
import { mountKona } from '../content/mount';

export default defineContentScript({
  // 3e: not in the manifest, so nothing is granted at install. The background
  // registers this once you allow the site, which is also when Kona can first
  // read it.
  registration: 'runtime',
  matches: [],
  main: (ctx) => mountKona(ctx, chatgptAdapter),
});

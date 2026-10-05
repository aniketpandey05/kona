import { geminiAdapter } from '../adapters/gemini';
import { mountKona } from '../content/mount';

export default defineContentScript({
  matches: ['https://gemini.google.com/*'],
  main: (ctx) => mountKona(ctx, geminiAdapter),
});

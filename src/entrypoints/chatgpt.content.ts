import { chatgptAdapter } from '../adapters/chatgpt';
import { mountKona } from '../content/mount';

export default defineContentScript({
  // A bare host misses www., and chat.openai.com still redirects here.
  matches: ['https://*.chatgpt.com/*', 'https://chat.openai.com/*'],
  main: (ctx) => mountKona(ctx, chatgptAdapter),
});

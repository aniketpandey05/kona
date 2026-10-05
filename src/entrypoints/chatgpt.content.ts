import { chatgptAdapter } from '../adapters/chatgpt';
import { mountKona } from '../content/mount';

export default defineContentScript({
  matches: ['https://chatgpt.com/*'],
  main: (ctx) => mountKona(ctx, chatgptAdapter),
});

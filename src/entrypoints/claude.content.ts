import { claudeAdapter } from '../adapters/claude';
import { mountKona } from '../content/mount';

export default defineContentScript({
  matches: ['https://claude.ai/*'],
  main: (ctx) => mountKona(ctx, claudeAdapter),
});

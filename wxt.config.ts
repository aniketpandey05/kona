import preact from '@preact/preset-vite';
import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  // WXT builds Firefox as MV2 by default, which silently drops
  // optional_host_permissions — and with it the whole "switch this site on"
  // flow, since every site but the three built-in ones is granted that way.
  manifestVersion: 3,
  // publicDir is resolved against the project root, not srcDir, so without this
  // the icons sitting next to the source are silently left out of the build.
  publicDir: 'src/public',
  manifest: ({ browser }) => ({
    name: 'Kona',
    description: 'Highlight, note and bookmark anything you read, then jump back to it.',
    // "activeTab" lets the popup see which page you're on when you click the icon, and nothing more.
    // "scripting" lets the extension start highlighting on a site right after you allow it.
    permissions: ['storage', 'unlimitedStorage', 'scripting', 'activeTab', 'contextMenus'],
    // The chat sites work out of the box; any other site is allowed one at a time from the popup.
    host_permissions: ['https://chatgpt.com/*', 'https://claude.ai/*', 'https://gemini.google.com/*'],
    optional_host_permissions: ['*://*/*'],
    action: { default_title: 'Kona' },
    // Firefox needs an explicit add-on id to be submitted, and a floor: the CSS
    // Custom Highlight API that paints every highlight only arrived in 140, so
    // below that Kona would install and then quietly fail to draw anything.
    ...(browser === 'firefox'
      ? {
          browser_specific_settings: {
            gecko: { id: 'kona@aniketpandey05.github.io', strict_min_version: '140.0' },
          },
        }
      : {}),
  }),
  // Hot refresh doesn't work inside content scripts, so leave it off.
  vite: () => ({ plugins: [preact({ prefreshEnabled: false })] }),
});

# The mockups

Eighteen boards across two canvases, drawn while the decisions were being made.
Each one carries a *What to look at* note naming the decision it shows, so a
board and `DESIGN-LOG.md` can be read against each other.

**Live, and private until shared:**

- [The panel, five states](https://claude.ai/artifact/2Z8BFWqEg8da4z2XRRkg6X)
- [The library, the settings and the phones](https://claude.ai/artifact/Y6ygBfVzVNq9KdNJetSs3U)

**The source is here**, in `panel/` and `library/`, because the canvases live
on claude.ai and this repository should not depend on them. Each folder is one
canvas: a `canvas.json` index giving every board its frame, and one
`.dc.html` per board. They are self-contained pages — opening one in a browser
shows that board, though the fonts come from Google Fonts and the `support.js`
the canvas provides is not here.

---

## The panel, in the page

| | |
| --- | --- |
| `Main` | At rest, with a space active. One mark, a count, and where highlights are going (2b, 2e) |
| `Open` | Open on this page: three highlights, one with a note (2a, 2c) |
| `Space` | The second tab — the active space, four sources, one of them an AI chat (2f) |
| `Empty` | A page with nothing kept, which is most pages. One faded mark (2d) |
| `JustMarked` | Just marked, and it does not belong here — the escape hatch is one tap (2g) |

## The library, the settings and the phones

| | |
| --- | --- |
| `Main` | Highlights at rest. The nav, the search box, the chips (17) |
| `Search` | One query across both views, the archived hit included and labelled (15) |
| `Archived` | The wall at fifteen: bring one back or Pro, and no delete in that notice (10a) |
| `Spaces` | Four of five, the active one ringed and saying so (1b, 2e) |
| `Unfindable` | The page has changed, and you still have the passage (13) |
| `Tapped` | Tapping a highlight you already made: colour, note, delete (10c) |
| `Account` | The row at the foot of the sidebar, three states, quiet unless sync stopped (17a) |
| `Pens` | The picker, the opacity slider, and the colours that outlived the palette (12) |
| `PhoneSelect` | iPhone: Safari's menu wherever it lands, and Kona's bar at the bottom (22) |
| `PhoneBar` | iPhone, just after marking. One strip, with undo, that leaves by itself |
| `PhonePanel` | iPhone: the panel as a sheet, not a side strip (9) |
| `PhoneLibrary` | iPhone: the nav folded behind the three bars |
| `AndroidShare` | Android Chrome: the share route, Chrome building the link itself (1h) |

---

## Not drawn

The welcome page and About (4), the popup's two states (3e), an image
highlight (18), a shared space with threads, and dark mode.

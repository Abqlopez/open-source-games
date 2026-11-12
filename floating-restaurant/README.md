# Floating Restaurant (version 2)

A cozy fishing + cooking game for the browser. You run a restaurant on a boat,
and in version 2 you do every job yourself.

- **Morning:** steer the boat around the sea, read the signs on the water to find
  fish, pick the right gear and bait, and win the stamina-and-tension fight.
- **Afternoon:** set the menu, shop, buy gear, upgrade and decorate.
- **Night:** walk the deck. Greet and seat customers, take orders, carry
  ingredients, chop, cook (it burns!), serve, collect the money, and wash plates.

Built with HTML5, JavaScript and [Phaser 3](https://phaser.io) (bundled in `vendor/`).
All art is painted in code at start-up, so there are no image files. Progress
auto-saves to `localStorage` at the end of each day; version 1 saves carry over.

## Play

Open `index.html` in a browser. No build step and no server needed.

Controls: **WASD / arrows** to move (or click a spot), **E / space** to do things.
Morning extras: **1-4** pick gear, **Q** changes bait, **T** drops a crab trap.

## Tuning

Every fish, recipe, customer, upgrade, price and timer lives in `js/data.js`.
Dish prices are worked out from ingredient costs (x3), so changing a fish's
`value` re-prices everything made from it.

| File | What it holds |
| --- | --- |
| `js/data.js` | All game data and numbers |
| `js/state.js` | Save/load, money ledger, journal, shared rules (freshness, quality, prices) |
| `js/art.js`, `js/art2.js` | Every sprite and backdrop |
| `js/ui.js` | Buttons, panels, HUD, input, sound blips, juice (bursts, popups, shake) |
| `js/fight.js` | The fish fight: stamina, line tension, each fish's special move, the boss |
| `js/fishing.js` | Morning: steering, fish signs, casting, gear, bait, traps |
| `js/prep.js` | Afternoon: menu, shop, gear + bait, upgrades, decor, tank, journal, lab |
| `js/service.js` | Night: the walk-around restaurant |
| `js/scenes.js` | Title, end-of-day earnings screen, game start-up |

## Testing shortcuts

- `index.html?speed=5` runs the morning and night clocks 5x faster.
- `index.html?auto=1` auto-wins every fish fight.

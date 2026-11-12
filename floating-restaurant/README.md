# Floating Restaurant (version 1)

A cozy fishing + cooking game for the browser. You run a restaurant on a boat:
fish in the morning, set the menu in the afternoon, cook and serve at night, and
upgrade the boat until it can sail to Coral Bay.

Built with HTML5, JavaScript and [Phaser 3](https://phaser.io) (bundled in `vendor/`).
All art is painted in code at start-up (`js/art.js`), so there are no image files. Progress auto-saves to `localStorage` at the end of each day.

## Play

Open `index.html` in a browser. No build step and no server needed.

Controls: mouse + spacebar (the orange ACTION button does the same job as space).

## Tuning

Every fish, recipe, customer, upgrade, price and timer lives in `js/data.js`.

| File | What it holds |
| --- | --- |
| `js/data.js` | All game data and numbers |
| `js/state.js` | Save/load and shared rules (freshness, dish quality, star rating) |
| `js/art.js` | Every sprite and backdrop: fish, dishes, customers, boat, sea, deck |
| `js/reel.js` | The five reeling minigames, one per fish personality |
| `js/cook.js` | The cooking minigames (chop, fry/grill, boil, slice/roll, plate) |
| `js/fishing.js` | Cast, bite, reel rig and the morning screen |
| `js/prep.js` | Afternoon: menu, shop, upgrades, decor, fish tank, kitchen lab |
| `js/service.js` | Night: customers, orders, kitchen stations, live catch |
| `js/scenes.js` | Title, end-of-day summary, game start-up |

## Testing shortcuts

- `index.html?speed=5` runs the morning and night clocks 5x faster.
- `index.html?auto=1` auto-wins every reeling and cooking minigame.

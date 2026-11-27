# Games

The family games app at https://games.app.haddow.me: a home screen of games, one profile (name and colour, no sign-in) and leaderboards. Each game is a page here (`/stack`, `/race`, `/squid`, `/crops`, `/pipes`, `/slide`, `/robot`, `/garden`). The old apps' subdomains and repos (`~/code/stack`, `~/code/race`, `~/code/squid`, `~/code/crops`) are left as they were, to be closed or redirected.

## Worth knowing

- `src/lib/games.ts` lists the games and their boards (a game can have several; each board's `key` is its scores' key and URL). Adding a game or a board starts there. Tile icons are in `static/icons/`.
- A profile is a random id in the `games-profile` cookie (HttpOnly, host-only). The profile page lists everyone, to claim a name ("That's me") on another device instead of making a duplicate. Anyone can claim anyone, which is fine for a household.
- Games post scores with `postScore` (`src/lib/scores.ts`) to `/api/scores/<game>`. `best` keeps one row per player per game. Games should post their device's best each time they show it, so scores from before a name was picked still count.
- A board with `daily: true` starts afresh each day (London time): its scores are kept under `<key>:<date>` (`scoreKey`), and the server picks the day, so the client just posts to `/api/scores/<key>`.
- Scores are trusted from the client (household games); only sanity limits apply.
- `e2e/fixtures.sql` seeds Sam and Kim, and the e2e tests rely on them.
- Every game's menu and end screens show `GamesButton` (`src/lib/components/`), the one way back to `/`; never mid-play. A new game uses it rather than its own back link. With `ownApp` (Squid, Crops) it hides when installed as its own app.
- No secrets, no Tailwind.
- Squid and Crops install as their own home-screen apps: their manifests and icons are in `static/<game>/`, their head tags in `+layout.svelte` (`APPS`). Each registers the one service worker (`src/service-worker/`) with its own scope via `keepOffline` (`src/lib/offline.ts`): the page sends it the files it loaded to keep, and the page itself is network first.
- The viewport, manifest and home-screen tags are in `+layout.svelte`, not `app.html`.
- Planned features: `docs/roadmap.md`.

## Stack (`/stack`)

- `src/lib/stack/stacker.ts` is the rules (slicing, perfect drops, speed, sky colours): pure and unit tested, keep it that way. `Game.svelte` draws it on a canvas and runs the loop. Its look (sky, stencil type, slabs) is scoped to the component.
- The canvas loop keeps its state in plain variables, not `$state`: it changes every frame.
- The best on this device is kept in `localStorage` (`stack-best`), and goes on the board once a name is picked.

## Race (`/race`)

- three.js, loaded only on its page. `src/lib/race/`: `track.ts`, `terrain.ts`, `bike.ts`, `ai.ts`, `race.ts` and `tilt.ts` are pure and unit tested, so keep three.js out of them. `game.ts` runs the loop; `world.ts` and `models.ts` build the scene.
- Its styles are scoped to the page. The rules for `html`, `body` and its variables apply only while it's open (`:has(.race)`).
- The best lap lives in `localStorage` (`race:best-lap`, seconds) and goes on the board in milliseconds, on load and after each race.
- Conventions: heading h moves along (sin h, cos h) in x/z. Positive steer, lateral and lean are to the right, and positive curvature turns left.
- Tilt comes from `deviceorientation` relative to the screen orientation (`hooks.server.ts` allows the accelerometer and gyroscope). iOS needs `requestPermission` from a tap (Start).
- Aimed at young kids: arcade handling. Tuning: rival skills in `Game.setUp`, grip and speed in `bike.ts`. Keep ramps on straights with a flat or uphill landing.
- Testing: headless Chromium renders WebGL in software (swiftshader, deviceScaleFactor 1, landscape in `race.spec.ts`). To test a lap, step `game.update(1/60)` from `page.evaluate`.

## Squid Spells (`/squid`)

A drawing game for younger kids, moved in from `~/code/squid` (squid.app.haddow.me). `src/lib/squid/`: `gestures.ts` (shape recognition) and `progress.ts` (saves, levels, waves) are pure and unit tested; `game.ts` is the loop, `sprites.ts` draws everything, `audio.ts` synthesises the sounds. `Squid.svelte` is the page.

- Keep it for small kids: no reading needed, nothing scary, no losing in Chill. Watch frame rate on old tablets (no allocations in hot loops) and touch on iOS Safari.
- The save is in `localStorage` (`squid-spells-v1`). One board, `squid`: most friends in one Challenge game. Rows show as squids in the profile colour. Saves on old devices stayed in the old app (iOS keeps each home-screen app's storage apart); its board's rows were copied in as profiles `squid:<device>`, which a player can claim on the profile page.
- Its styles are scoped to the page (`:has(.squid)`). Its own manifest (`static/squid/`) makes it a separate home-screen app, landscape and full screen.
- E2E: `e2e/squid.spec.ts` reads `window.__squid.state`, and runs without race's software WebGL, which makes its fast-forwards too slow.

## Crops (`/crops`)

A top-down pixel-art farming game for younger kids on a tablet (touch, landscape first), moved in from `~/code/crops`. Tap to walk round a village and use things: farm a field (more land to buy), keep chickens, cows and sheep, fish in the pond, help villagers, shop at the market, ride a horse, and buy house upgrades, decorations and a statue from the builder. No board. The old app (crops.app.haddow.me) is left running as it was: its farms stay in its own storage (iOS keeps each home-screen app's apart), so nothing moves across.

- The farm saves to localStorage (`crops-farm`), so `Crops.svelte` only renders in the browser; the page is still server-rendered, so it opens offline.
- `src/lib/crops/game.ts` holds all the rules: pure functions on a plain JSON `Farm`, unit tested. Keep it that way, and keep `parseFarm` accepting old saves: a child's farm must never be wiped by an update.
- `Farm.animals` holds one timer per animal; the market sells more (up to a limit) and buys them back, but never the last of a kind. `Farm.plots.length` is the land owned: 12 to start, then strips (`LAND`) in `PLOTS` order: the main field 4 at a time, then the north field behind home 6 at a time. Version 3 saves (3×3 field) are moved onto the same tiles.
- The builder: `Farm.home` counts house upgrades (`HOME`), `Farm.decor` lists what's built (`DECOR`) and `Farm.statue` is the one statue. The fountain site and plinth are always there (blocking, in `BUILDINGS`), and only their look changes; lamps, flower beds and bunting are drawn where you can walk (`LAMPS`, `BEDS`, `BUNTING`).
- Growth uses real timestamps, so crops keep growing while the game is closed.
- `src/lib/crops/world/`: `map.ts` (terrain, buildings, people; built in code), `interact.ts` (what's on a tile, and so what tapping it does: pure, tested), `path.ts` (shortest walk, breadth first: pure, tested), `engine.ts` (canvas loop: walking routes, camera, wandering animals, riding, fishing line), `sprites.ts` (all the pixel art).
- Tapping something walks beside it, faces it and uses it (`act` in `Crops.svelte`). Animals hold still while you walk to them. A horse can't go on the crops, so tapping a plot it can't reach hops off first. Animals keep clear of the tiles by their gates.
- Art is drawn in code: flat rectangles on small canvases with an automatic 1px ink outline, at 16px per tile, scaled up to about 64px on a tablet. No image files apart from the icons. Menus show sprites as data URLs.
- `map.spec.ts` checks every plot, person, building and the horse can be reached from the start: run it after moving things on the map. A saved position that ends up blocked resets to the start.
- Its look is in `crops.css`, scoped to the page (`:has(.crops)`). Numbers use Press Start 2P; words use Pixelify Sans (its 5 looks like an S).
- There's no menu screen, so the Games button sits in its top bar, beside the coins.
- Kid rules: nothing dies or is lost, icons over words, big touch targets, and `rescue()` hands over a carrot seed if the farm is ever stuck. Watch touch on iPad Safari.
- In dev, `window.world` is the engine: e2e tests (`e2e/crops.spec.ts`, landscape iPad) tap tiles with `world.screenOf(x, y)`.
- `node scripts/crops-shot.mjs <url> <out.png> [w] [h] [farm.json]` screenshots it with a given save.

## Pipes (`/pipes`)

- `src/lib/pipes/pipes.ts` is the rules (tiles as N/E/S/W bitmasks, the generator, where the water flows): pure and unit tested. `Pipes.svelte` draws it with SVG tiles, no canvas.
- The generator walks a winding route from the tap to the plant, fills the rest with decoys, then turns every tile at random. Each tile keeps `home` (how it was made), which the e2e test uses to solve it.
- Level n is seeded from n (`levelFor`), so it's the same for everyone. No clock: levels carry on where you left off, and the board is levels done.
- Tuning: grid size in `levelSize`. Levels done are in `localStorage` (`pipes-best`, the old best run, which carries on), or the board if that's further.

## Slide Sort (`/slide`)

- `src/lib/slide/slide.ts` is the rules: pure and unit tested. The day's puzzle is seeded from the date (`puzzleFor`), mixed up by `PAR` slides that each change something, so par can always be met.
- Its board is daily (above). The device's best for the day is in `localStorage` (`slide-best`, with the date). One slide per swipe.
- The e2e test solves it by undoing the mix that `puzzleFor` returns.

## Robot Path (`/robot`)

- `src/lib/robot/robot.ts` is the rules (rolling, running a program, the fewest-moves search, levels): pure and unit tested. `Robot.svelte` is the page.
- Level n is seeded from n, so it's the same for everyone; `levelFor` retries layouts until `solve` gives the par `levelShape` wants. Tuning: `levelShape` (size, gems, par) and `starsFor`.
- Missing a gem never loses: the robot goes back to the start with the moves kept.
- The save is `localStorage` `robot-v1` (stars per level); the board is total stars.

## Garden Defence (`/garden`)

- `src/lib/garden/garden.ts` is the rules (the path, planting, upgrades, waves, shots, munching, hearts): pure, seeded and unit tested. `draw.ts` draws everything on the canvas in code; `Garden.svelte` is the page and runs the loop.
- Tower defence, portrait: zombies walk a fixed winding path (`PATH`, a cell list) from the hedge at the top to the house at the bottom. A zombie's place is `d`, cells along the path (`pointAt(d)` gives x, y). A plant at (col, row) fills that cell.
- Between waves (`building`) you spend coins: shooters on the grass, walls and mud on the path. Tap a plant to upgrade it (to level 3) or sell it for half. Nothing can be planted mid-wave. Coins only come from clearing a wave (`waveReward`); walls are mended between waves.
- Friendly: beaten zombies nod off (Zzz) rather than die. Plants unlock by wave (`PLANTS[k].from`).
- Tuning: `PLANTS`, `ZOMBIES`, `waveShape`, `waveSpawns`, `toughness`, `START_COINS` and `waveReward`. Simulated, no plants loses wave 1, pea pods alone reach about wave 8, a mixed, upgraded garden about 15.
- The best is in `localStorage` (`garden-best`); the board is most waves survived.
- In dev, `window.__garden` has the garden, `run(seconds)` to fast-forward and `screenOf(col, row)` for taps (`e2e/garden.spec.ts`).

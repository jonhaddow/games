# Games

The family games app at https://games.app.haddow.me: a home screen of games, one profile (name and colour, no sign-in) and a leaderboard per game. Each game is a page here (`/stack`, `/race`). Their old subdomains and repos (`~/code/stack`, `~/code/race`) are left as they were, to be closed or redirected.

## Worth knowing

- `src/lib/games.ts` lists the games and their boards (which way is better, sane maximum, formatting). Adding a game or a board starts there. Tile icons are in `static/icons/`.
- A profile is a random id in the `games-profile` cookie (HttpOnly, host-only). The profile page lists everyone, to claim a name ("That's me") on another device instead of making a duplicate. Anyone can claim anyone, which is fine for a household.
- Games post scores with `postScore` (`src/lib/scores.ts`) to `/api/scores/<game>`. `best` keeps one row per player per game. Games should post their device's best each time they show it, so scores from before a name was picked still count.
- Scores are trusted from the client (household games); only sanity limits apply.
- `e2e/fixtures.sql` seeds Sam and Kim, and the e2e tests rely on them.
- No secrets, no service worker, no Tailwind.

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

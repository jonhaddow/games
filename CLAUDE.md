# Games

The launcher at https://games.app.haddow.me: a tile for each game, a profile (name and colour, no sign-in) and the shared leaderboards. Each game stays on its own subdomain and repo.

## Worth knowing

- `src/lib/games.ts` lists the games and their boards (which way is better, sane maximum, formatting). Adding a game or a board starts there. Tile icons are copies in `static/icons/`.
- A profile is a random id. The launcher keeps it in its own `games-profile` cookie. Games can't share that cookie: on iOS every home-screen app has its own cookies. So each game keeps the id in its own `localStorage`, handed over as `#profile=<id>` in links from here (tiles, and the way back from the profile page). Games send it in the `x-games-profile` header.
- The profile page lists everyone, to claim a name ("That's me") on another device or app instead of making a duplicate. Anyone can claim anyone, which is fine for a household.
- Games call `/api/scores/<game>` cross-origin, without cookies. `cors.ts` allows `https://*.app.haddow.me` (and localhost in dev). Each game's CSP needs `connect-src https://games.app.haddow.me`.
- `e2e/fixtures.sql` seeds Sam and Kim, and the e2e tests rely on them.
- `best` keeps one row per player per game. Games should post their device's best each time they show the board, so scores from before a name was picked still count.
- Scores are trusted from the client (household games); only sanity limits apply.
- The profile page takes `?back=`: a path here or an `https://*.app.haddow.me` URL. Games link there to "pick a name".
- No secrets, no service worker, no Tailwind.

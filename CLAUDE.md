# Games

The launcher at https://games.app.haddow.me: a tile for each game, a profile (name and colour, no sign-in) and the shared leaderboards. Each game stays on its own subdomain and repo.

## Worth knowing

- `src/lib/games.ts` lists the games and their boards (which way is better, sane maximum, formatting). Adding a game or a board starts there. Tile icons are copies in `static/icons/`.
- The profile is a random id in the `games-profile` cookie, HttpOnly, on `Domain=app.haddow.me` (no domain locally). Games send it by fetching with `credentials: 'include'`. SameSite=Lax still sends it, because the subdomains are the same site.
- Games call `/api/scores/<game>` cross-origin. `cors.ts` allows `https://*.app.haddow.me` (and localhost in dev). Each game's CSP needs `connect-src https://games.app.haddow.me`.
- `best` keeps one row per player per game. Games should post their device's best each time they show the board, so scores from before a name was picked still count.
- Scores are trusted from the client (household games); only sanity limits apply.
- The profile page takes `?back=`: a path here or an `https://*.app.haddow.me` URL. Games link there to "pick a name".
- No secrets, no service worker, no Tailwind.

# Games

The family games app at https://games.app.haddow.me: a home screen of games, one profile (name and colour, no sign-in) and a leaderboard per game. Each game is a page here (`/stack`, `/race`). Their old subdomains and repos (`~/code/stack`, `~/code/race`) are left as they were, to be closed or redirected.

## Worth knowing

- `src/lib/games.ts` lists the games and their boards (which way is better, sane maximum, formatting). Adding a game or a board starts there. Tile icons are in `static/icons/`.
- A profile is a random id in the `games-profile` cookie (HttpOnly, host-only). The profile page lists everyone, to claim a name ("That's me") on another device instead of making a duplicate. Anyone can claim anyone, which is fine for a household.
- Games post scores to `/api/scores/<game>` (same origin, with the cookie). `best` keeps one row per player per game. Games should post their device's best each time they show it, so scores from before a name was picked still count.
- Scores are trusted from the client (household games); only sanity limits apply.
- `e2e/fixtures.sql` seeds Sam and Kim, and the e2e tests rely on them.
- No secrets, no service worker, no Tailwind.

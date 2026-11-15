# Games

A launcher for a family's web games, with one shared profile and leaderboard.

The home screen links to each game, and each game stays on its own site. You pick a name and colour once, with no sign-in. The launcher hands each game the player's id in its link, and the games send scores to this app's API from the browser. Renaming yourself updates every board.

## Tech stack

- [SvelteKit](https://svelte.dev) (Svelte 5) and TypeScript, as an installable web app
- [Cloudflare Workers](https://workers.cloudflare.com), with [D1](https://developers.cloudflare.com/d1/) (SQLite) through [Drizzle ORM](https://orm.drizzle.team)
- [Vitest](https://vitest.dev) and [Playwright](https://playwright.dev) for tests
- Deployed from `main` by Cloudflare Workers Builds

## Running locally

```sh
npm install
npm run db:migrate:local
npm run dev
```

Tests: `npm test` (unit), `npm run test:e2e` (Playwright), `npm run check` (types), `npm run lint`.

## Score API

Games name the player with an `x-games-profile` header (the id they were handed as `#profile=<id>`). CORS allows `https://*.app.haddow.me` only.

- `GET /api/scores/<game>` returns the board: `{ player, rows, me }`.
- `POST /api/scores/<game>` with `{ "value": n }` keeps the player's best, then returns the board. Without a profile, it's ignored, but the board still comes back.

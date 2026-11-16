# Games

A family games app: a home screen of small web games, with one profile and a leaderboard for each game.

You pick a name and colour once, with no sign-in, and your best in each game goes on its board. Renaming yourself updates every board.

The games:

- **Stack:** drop the sliding blocks to build the tallest tower. One thumb, on a canvas.
- **Race:** three laps of a 3D motorbike track with hills and jumps, steered by tilting the phone.

## Tech stack

- [SvelteKit](https://svelte.dev) (Svelte 5) and TypeScript, as an installable web app
- [three.js](https://threejs.org) for Race
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

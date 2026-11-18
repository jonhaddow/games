# Games

A family games app: a home screen of small web games, with one profile and leaderboards for each game.

You pick a name and colour once, with no sign-in, and your best in each game goes on its board. Renaming yourself updates every board.

The games:

- **Stack:** drop the sliding blocks to build the tallest tower. One thumb, on a canvas.
- **Race:** three laps of a 3D motorbike track with hills and jumps, steered by tilting the phone.
- **Squid Spells:** for younger kids. Draw the shape each sea creature shows to cast a spell and make it a friend, and win outfits for your squid. Plays offline once added to the home screen.
- **Crops:** for younger kids on a tablet. A gentle pixel-art farm: tap to walk round the village, grow crops, look after animals, fish, help villagers and spend coins on the farm and village. Nothing ever dies, and the farm keeps growing while the game is closed. No leaderboard. Plays offline once added to the home screen.
- **Pipes:** tap the pipes to turn them and get the water from the tap to the plant. Each level is bigger, and the clock is always running.
- **Slide Sort:** one puzzle a day, the same for everyone: slide rows and columns of coloured tiles until each row is one colour, in as few moves as you can.
- **Robot Path:** plan the robot's moves with arrows, then press Go. It rolls until it bumps into something; collect every gem in as few moves as you can for three stars.

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

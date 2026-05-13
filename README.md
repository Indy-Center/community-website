# community-website

SvelteKit app deployed to `flyindycenter.com`. Handles the public-facing community site — controller roster, events, feedback, visit requests, and admin tooling. Authentication runs through the `identity` Worker via RPC service binding; session state is stored in a D1 database.

## Project layout

```
community-website/
├── website/          — SvelteKit app (flyindycenter.com)
└── task-runners/     — Cron Worker that fires internal triggers
```

### `website/`

- `src/hooks.server.ts` — auth gate; reads `fic_session` cookie, validates against identity RPC, populates `locals.user`, `locals.session`, `locals.roles`.
- `src/routes/login`, `src/routes/logout` — VATSIM Connect OAuth flow.
- `src/routes/roster/` — controller roster page.
- `src/routes/events/` — events listing.
- `src/routes/feedback/` — member feedback submission.
- `src/routes/visit/` — visiting controller request form.
- `src/routes/admin/` — admin tooling; role-gated.
- `src/routes/settings/` — member profile/settings.
- `src/routes/triggers/process-roster/` — internal HTTP trigger; refreshes roster data from VATSIM. Called by the task runner, not exposed publicly.
- `src/lib/server/identity.ts` — typed RPC client wrapper for the `IDENTITY` service binding.
- `src/lib/server/membership.ts` — lazy membership sync logic (runs in `waitUntil` on authed requests).
- `src/lib/server/vatsim/` — VATSIM Data Feed integration.
- `src/lib/server/discord.ts` — Discord webhook helpers.

### `task-runners/`

A lightweight Cloudflare Worker (`task-runner`) with a single `process-roster` environment. Fires every 5 minutes, calls `POST /triggers/process-roster` on the `community-website` Worker via service binding, and returns.

## Bindings

| Binding | Type | Purpose |
|---------|------|---------|
| `IDENTITY` | Service | RPC calls to the identity Worker |
| `DB` | D1 | Website-local data (sessions, roster cache, etc.) |
| `ASSETS` | Assets | Static files from the SvelteKit build |
| `CF_VERSION_METADATA` | Version metadata | Build version tracking |

## Local development

```bash
cd website
npm install
cp .env.example .env   # fill in VATSIM OAuth credentials and any secrets
npm run dev            # http://localhost:5173
```

`adapter-cloudflare` proxies the `IDENTITY` and `DB` bindings via `getPlatformProxy()` during `vite dev` — you don't need `wrangler dev` for bindings to work locally. You will need the `identity` Worker running locally if you want auth to function end-to-end.

## Deployment

Pushing to `main` deploys automatically. Manual deploy:

```bash
cd website
npm run build && wrangler deploy
```

The task runner deploys separately:

```bash
cd task-runners
wrangler deploy --env process-roster
```

Production secrets (OAuth credentials, Sentry DSN, etc.) live in Cloudflare — set each with `wrangler secret put`.

## Disclaimer

We are not affiliated with the FAA or any aviation governing body. This software is for flight simulation use on the [VATSIM](https://www.vatsim.net) network.

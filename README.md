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
- `src/routes/partners/` — partner cards, from the CMS.
- `src/routes/partners/[slug]/` — one partner's page. Member perks go only to signed-in users; a guest's page data holds just how many there are.
- `src/routes/admin/` — admin tooling; role-gated.
- `src/routes/settings/` — member profile/settings.
- `src/routes/triggers/process-roster/` — internal HTTP trigger; refreshes roster data from VATSIM. Called by the task runner, not exposed publicly.
- `src/lib/server/identity.ts` — typed RPC client wrapper for the `IDENTITY` service binding.
- `src/lib/server/membership.ts` — lazy membership sync logic (runs in `waitUntil` on authed requests).
- `src/lib/server/vatsim/` — VATSIM Data Feed integration.
- `src/lib/server/discord.ts` — Discord webhook helpers.
- `src/lib/server/partners.ts` — reads the partners document as the visitor may see it (member perks in full if signed in, only a count for a guest), or null when the CMS is down and no copy is kept. Every page that shows partners reads through it.

### `task-runners/`

A lightweight Cloudflare Worker (`task-runner`) with a single `process-roster` environment. Fires every 5 minutes, calls `POST /triggers/process-roster` on the `community-website` Worker via service binding, and returns.

## Bindings

| Binding               | Type             | Purpose                                           |
| --------------------- | ---------------- | ------------------------------------------------- |
| `IDENTITY`            | Service          | RPC calls to the identity Worker                  |
| `DB`                  | D1               | Website-local data (sessions, roster cache, etc.) |
| `ASSETS`              | Assets           | Static files from the SvelteKit build             |
| `CF_VERSION_METADATA` | Version metadata | Build version tracking                            |

## Vars and secrets for the CMS

Partners are edited in the CMS (Payload, at `cms.flyindycenter.com`) and read
from its `GET /api/community/partners` by `src/lib/server/cms/`, the only
place that talks to it.

| Name                  | Kind       | What                                                                                                                     |
| --------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------ |
| `CMS_URL`             | Var        | The CMS's origin. `https://cms.flyindycenter.com` in `wrangler.jsonc`, and the default when unset.                       |
| `COMMUNITY_API_TOKEN` | **Secret** | The CMS's server credential for the partners document, sent as a bearer token. `wrangler secret put COMMUNITY_API_TOKEN` |

Without `COMMUNITY_API_TOKEN` the CMS refuses every read, and only copies
already kept are served.

The partners document is kept in the Workers Cache API (in memory under
`vite dev`):

- **Fresh for 5 minutes**: served without asking the CMS, so an edit shows on
  the site within that.
- **Kept for 7 days**: when the CMS fails, answers with an error, or takes over
  5 seconds, the last good copy is served instead.
- With no copy at all and the CMS down, `/partners` and each partner's page say
  partners couldn't be loaded.

The document's shape is the contract in `src/lib/server/cms/types.ts`, copied
by hand from the payload repo. When the CMS changes it, copy it again and update
the test fixtures with it.

Locally, set both in `.env`. To read partners from a payload dev server
running alongside:

```bash
CMS_URL=http://localhost:3000
COMMUNITY_API_TOKEN=   # the same value as COMMUNITY_API_TOKEN in payload's .env
```

## Local development

```bash
cd website
npm install
cp .env.example .env   # fill in VATSIM OAuth credentials and any secrets
npm run dev            # http://localhost:5173
```

`adapter-cloudflare` proxies the `IDENTITY` and `DB` bindings via `getPlatformProxy()` during `vite dev` — you don't need `wrangler dev` for bindings to work locally. You will need the `identity` Worker running locally if you want auth to function end-to-end.

## Tests

```bash
npm test   # vitest
```

Tests call a page's server load with a hand-built event and a fake CMS behind
`fetch` that serves fixtures shaped exactly like the contract
(`src/lib/testing/`). They assert what each page is sent, including when the
CMS is down. The fixtures' content is made up: this repository is public, so
never put a real partner's details or member perk in a test.

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

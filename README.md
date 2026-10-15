# community-website

SvelteKit app deployed to `flyindycenter.com`. Handles the public-facing community site — controller roster, events, feedback, visit requests, and admin tooling. Sign-in goes through the identity server (`id.flyindycenter.com`) over OAuth, or VATSIM Connect when `AUTH_PROVIDER` isn't `identity`; the site keeps its own sessions in a D1 database.

## Project layout

One SvelteKit app at the repository root, deployed as the `community-website` Worker. `src/worker.ts` is its entry point: it serves the site and runs the roster refresh on a cron every 5 minutes.

- `src/hooks.server.ts` — auth gate; reads the `session` cookie, validates it against D1, populates `locals.user`, `locals.session`, `locals.roles` (for identity sessions, roles are refreshed from the identity server at most every 5 minutes). Also gives each request its CMS client, `locals.cms`.
- `src/routes/login`, `src/routes/logout` — sign-in and sign-out; `src/routes/login/connect/` starts the OAuth flow, `src/routes/login/identity/callback/` and `src/routes/login/connect/callback/` finish it.
- `src/routes/roster/` — controller roster page.
- `src/routes/events/` — events listing.
- `src/routes/feedback/` — member feedback submission.
- `src/routes/visit/` — visiting controller request form.
- `src/routes/partners/` — partner cards, from the CMS.
- `src/routes/partners/[slug]/` — one partner's page. Member perks go only to signed-in users; a guest's page data holds just how many there are.
- `src/routes/admin/` — admin tooling; role-gated.
- `src/routes/settings/` — member profile/settings.
- `src/lib/server/triggers/processRoster.ts` — the cron job: refreshes the roster from VATUSA, syncs memberships, renews controllers' certifications.
- `src/lib/server/identity.ts` — OAuth client for the identity server, and its userinfo lookup.
- `src/lib/server/membership.ts` — membership sync; run for one user at sign-in, and for everyone by the cron job.
- `src/lib/server/vatsim/` — VATSIM Data Feed integration.
- `src/lib/server/discord.ts` — Discord webhook helpers.
- `src/lib/server/partners.ts` — reads the partners document as the visitor may see it (member perks in full if signed in, only a count for a guest), or null when the CMS is down and no copy is kept. Every page that shows partners reads through it.

## Bindings

| Binding               | Type             | Purpose                                           |
| --------------------- | ---------------- | ------------------------------------------------- |
| `DB`                  | D1               | Website-local data (sessions, roster cache, etc.) |
| `ASSETS`              | Assets           | Static files from the SvelteKit build             |
| `CF_VERSION_METADATA` | Version metadata | Build version tracking                            |

## Vars and secrets for the CMS

Partners are edited in the CMS (Payload, at `cms.flyindycenter.com`) and read
from its `GET /api/community/partners` by `src/lib/server/cms/`, the only
place that talks to it.

| Name                  | Kind       | What                                                                                                                     |
| --------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------ |
| `CMS_URL`             | Var        | The CMS's origin. Optional; the default, `https://cms.flyindycenter.com`, is in `src/hooks.server.ts`.                   |
| `COMMUNITY_API_TOKEN` | **Secret** | The CMS's server credential for the partners document, sent as a bearer token. `wrangler secret put COMMUNITY_API_TOKEN` |

Without `COMMUNITY_API_TOKEN` the CMS refuses every read, and only copies
already kept are served.

The partners document is kept in the Workers Cache API (in memory under
`vite dev`):

- **Fresh for 5 minutes**: served without asking the CMS, so an edit shows on
  the site within that.
- **Kept for 7 days**: when the CMS fails, answers with an error, takes over
  5 seconds, or answers with something that isn't a partners document, the last
  good copy is served instead. A response is only kept once it has the
  document's shape (`src/lib/server/cms/schema.ts`).
- With no copy at all and the CMS down, `/partners` and each partner's page say
  partners couldn't be loaded.

The document's shape is the contract in `src/lib/cms/types.ts`, copied
by hand from the payload repo. When the CMS changes it, copy it again and update
the test fixtures with it.

Locally, set both in `.env`. To read partners from a payload dev server
running alongside:

```bash
CMS_URL=http://localhost:3000
COMMUNITY_API_TOKEN=   # the same value as COMMUNITY_API_TOKEN in payload's .env
```

## Local development

From the repository root:

```bash
npm install
touch .env    # then add the secrets below that you need
npm run dev   # applies local D1 migrations, then serves http://localhost:5173
```

There is no `.env` template. The vars in `wrangler.jsonc` cover the rest; set these in `.env` for the features you're working on:

- `IDENTITY_CLIENT_SECRET` — sign-in through the identity server (`IDENTITY_URL` points it at another one). `CONNECT_CLIENT_SECRET` instead when `AUTH_PROVIDER` isn't `identity`.
- `CMS_URL`, `COMMUNITY_API_TOKEN` — partners; see above.
- `VATUSA_API_KEY` — VATUSA roster and API calls.
- `DISCORD_WEBHOOK_SENIOR_STAFF_ALERTS`, `DISCORD_WEBHOOK_TECH_TEAM_ALERTS` — Discord alerts.

`adapter-cloudflare` proxies the `DB` binding via `getPlatformProxy()` during `vite dev` — you don't need `wrangler dev` for bindings to work locally.

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

Pushing to `main` deploys automatically. Manual deploy, which applies the remote D1 migrations first:

```bash
npm run build && npm run deploy
```

The roster cron deploys with the site; it is `triggers.crons` in `wrangler.jsonc`.

Production secrets (OAuth client secrets, `COMMUNITY_API_TOKEN`, `VATUSA_API_KEY`, the Discord webhooks) live in Cloudflare — set each with `wrangler secret put`.

## Disclaimer

We are not affiliated with the FAA or any aviation governing body. This software is for flight simulation use on the [VATSIM](https://www.vatsim.net) network.

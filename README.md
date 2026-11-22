# community-website

SvelteKit app deployed to `flyindycenter.com`. Handles the public-facing community site — controller roster, events, feedback, visit requests, and admin tooling. Sign-in goes through the identity server (`id.flyindycenter.com`) over OAuth, or VATSIM Connect when `AUTH_PROVIDER` isn't `identity`; the site keeps its own sessions in a D1 database.

## Project layout

One SvelteKit app at the repository root, deployed as the `community-website` Worker. `src/worker.ts` is its entry point: it serves the site and runs the roster refresh on a cron every 5 minutes.

- `src/hooks.server.ts` — auth gate; reads the `session` cookie, validates it against D1, populates `locals.user`, `locals.session`, `locals.roles` (for identity sessions, roles are refreshed from the identity server at most every 5 minutes). Also gives each request its CMS client, `locals.cms`.
- `src/routes/login`, `src/routes/logout` — sign-in and sign-out; `src/routes/login/connect/` starts the OAuth flow, `src/routes/login/identity/callback/` and `src/routes/login/connect/callback/` finish it.
- `src/routes/roster/` — controller roster page.
- `src/routes/events/` — events listing.
- `src/routes/feedback/` — member feedback submission.
- `src/routes/admin/feedback/` — the feedback review queue; `[id]/` reviews one item. See [Feedback review](#feedback-review).
- `src/routes/visit/` — visiting controller request form.
- `src/routes/partners/` — partner cards, from the CMS.
- `src/routes/partners/[slug]/` — one partner's page. Member perks go only to signed-in users; a guest's page data holds just how many there are.
- `src/routes/admin/` — admin tooling; role-gated.
- `src/routes/settings/` — member profile/settings.
- `src/lib/server/triggers/processRoster.ts` — the cron job: refreshes the roster copy from the training app, then syncs memberships from it; syncs the staff points of contact from VATUSA.
- `src/lib/server/roster.ts` — the roster refresh, and the reads of the stored credentials: the available credentials, and one CID's. `src/lib/credentials.ts` names and sorts credentials in the browser.
- `src/lib/server/identity.ts` — OAuth client for the identity server, and its userinfo lookup.
- `src/lib/server/membership.ts` — membership sync; run for one user at sign-in, and for everyone by the cron job.
- `src/lib/server/vatsim/` — VATSIM Data Feed integration.
- `src/lib/server/discord.ts` — Discord messages: the feedback alerts and post Larry queues, and the older webhook helper.
- `src/lib/server/feedback.ts` — feedback review helpers: the review log, reviewers, and how a pilot is named when feedback is published.
- `src/lib/server/partners.ts` — reads the partners document as the visitor may see it (member perks in full if signed in, only a count for a guest), or null when the CMS is down and no copy is kept. Every page that shows partners reads through it.

## Design system

New UI uses [Indy Centerline](https://centerline.flyindycenter.com), following the
[design rules](https://tech.flyindycenter.com/design/): components from
`@indy-center/centerline-svelte`, and colours by role (`bg-card`, `text-foreground`,
`border-input`…) from `@indy-center/centerline-tokens`, imported in `src/app.css`. Older pages
still use Tailwind's `slate-*`/`gray-*`/`sky-*` directly; move them to roles when you touch them.

`colorSchemeHandle` in `src/hooks.server.ts` writes the member's light or dark choice (a cookie
shared across flyindycenter.com) on `<html>`. Until the older pages move to roles, the root
layout pins the site to dark with `data-theme="dark"`, since those pages are drawn in fixed dark
colours. Remove it, and add `ColorSchemeSetting` to the user menu and Settings, once they have.

## Bindings

| Binding               | Type             | Purpose                                                                                    |
| --------------------- | ---------------- | ------------------------------------------------------------------------------------------ |
| `DB`                  | D1               | Website-local data (sessions, the roster copy, etc.)                                       |
| `TRAINING`            | Service          | The training app's `TrainingRpc` entrypoint (`training-tools` Worker): the roster below    |
| `LARRY`               | Service          | Larry's Worker (`indy-larry`): Discord messages sent as the bot, such as staffing requests |
| `ASSETS`              | Assets           | Static files from the SvelteKit build                                                      |
| `CF_VERSION_METADATA` | Version metadata | Build version tracking                                                                     |

## Where the roster comes from

The training app (`training-tools`) owns the controller roster and the credentials. Every 5
minutes the cron calls `getRoster()` on the `TRAINING` binding, whose types come from the
`@indy-center/training-tools` package, and stores the answer in D1: each member
(`vatsim_controllers`, keyed by CID, with their certification and endorsements) and the
available credentials (`available_credentials`). Sign-in membership, the staff page, profiles
and `/roster` all read that copy. The site makes no VATUSA roster call.

If the training app throws or answers with no members, the copy is kept as it was, a warning
is logged and the membership sync is skipped. The staff points of contact still come from
VATUSA, on their own.

The copy holds a member's last name even when VATUSA name privacy (`namePrivacy`) is set; a
page never sends it then.

## Staffing requests

`/staffing` (under Flying) lets a signed-in pilot organization ask the Events Team to staff an
event. The request isn't stored: `send()` on the `LARRY` binding posts it as an embed to the
channel Larry's `SEND_CHANNELS` names `events-team` (`STAFFING_CHANNEL`), and the pilot is told if that fails. The
binding's types come from `@indy-center/indy-larry-worker`; the message is built in
`src/lib/server/staffing.ts`. Pinging is off, so text a pilot types can't mention anyone.

Larry's deploy needs `events-team:<channel ID>` in `SEND_CHANNELS`, and the bot needs View Channel,
Send Messages and Embed Links there.

## Feedback review

Pilots submit feedback at `/feedback`; it always starts as **New**, whatever the form sends.
Reviewers work it at `/admin/feedback`: **Accept**, **Follow Up** (assigned to a reviewer, who
logs comments and actions) or **Reject**. Every change is written to the item's log
(`feedback_events`) in the same `db.batch` as the change itself, which D1 runs as one
transaction, so a failed save changes nothing. Each item's page shows its log as an audit trail
(Centerline `Steps`, built by `reviewSteps` in `src/lib/utils/feedbackReview.ts`), ending with
what happens next.

Accepted feedback shows on the controller's private `/profile`. Staff can then publish it, after
editing what goes out (the original submission is kept as it was, in its own columns):

- **Identified**: with the pilot's name and callsign, and posted to Discord.
- **De-identified**: without pilot details, which are never stored; not posted to Discord.

New feedback can be accepted and published in one step; both are saved in one write.

Reviewers are admins and anyone with the `feedback:reviewer` role (`community:feedback:reviewer`
from identity). Reviewers who aren't admins see only the feedback section of admin.

Senior staff are only alerted when someone has to do something: new feedback to triage, and a
follow up to work (when it's flagged or reassigned, naming who works it). Accepting, rejecting
and publishing aren't alerted; they're on the item's page. Each alert has a button to the item,
and no message pings anyone.

Discord messages go through Larry's `enqueue()`, since nobody waits on them: Larry retries rate
limits and outages. The review still saves if Larry won't take a message; a failed public post is
noted in the log and shown to the reviewer. Larry's deploy needs these in `SEND_CHANNELS`:

| Name                  | What goes there                                |
| --------------------- | ---------------------------------------------- |
| `senior-staff-alerts` | New feedback, and follow ups to work           |
| `controller-feedback` | Feedback published as identified, without CIDs |

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
- `VATUSA_API_KEY` — VATUSA API calls, such as adding a visitor. (The roster comes from the training app.)
- `DISCORD_WEBHOOK_SENIOR_STAFF_ALERTS`, `DISCORD_WEBHOOK_TECH_TEAM_ALERTS` — Discord alerts.

`adapter-cloudflare` proxies the `DB` binding via `getPlatformProxy()` during `vite dev` — you don't need `wrangler dev` for bindings to work locally.

### Discord messages from a fake Larry

To send a staffing request or a feedback alert locally, run `dev/fake-larry/`, which prints each
message instead of posting it, beside the site:

```bash
npm run dev:larry   # 1: the fake Larry, on port 8789
npm run dev         # 2: the site
```

Start the fake first. Without it the staffing form says the request couldn't be sent, and
feedback alerts are skipped with an error in the log.

### Roster from a fake training app

`vite dev` serves pages but never runs the cron, so the roster copy stays as it is. To fill it,
run the built Worker under `wrangler dev` beside `dev/fake-training/`, a stand-in for the
training app's `TrainingRpc` that answers 150 made-up members (more than D1's 100-parameter
limit) and seven credentials. Two terminals, from the repository root:

```bash
npm run dev:training           # 1: the fake training app, on port 8788
npm run dev:worker             # 2: migrates local D1, builds, serves http://localhost:8787
```

Run them as two processes, not one `wrangler dev -c … -c …`: in one process the second cron
run crashes on a console-patching loop between wrangler and Sentry. Start the fake first; the
site's startup table then shows `env.TRAINING (training-tools#TrainingRpc) … [connected]`.
Either takes wrangler's own flags after `--`, such as `npm run dev:worker -- --port 3109`.

Then run the roster refresh, as the cron would:

```bash
curl "http://localhost:8787/__scheduled?cron=0-59/5+*+*+*+*"   # answers "Ran scheduled event"
```

The site's terminal logs `Stored 150 controllers and 7 available credentials from the training
app`, and `/roster` lists them. Stop the fake and run it again to see a refused answer: the log
says `Keeping the last roster copy` and `Skipping the membership sync`, and `/roster` is
unchanged. The copy stays in `.wrangler/state` between runs.

## Tests

```bash
npm test   # vitest
```

Tests call a page's server load with a hand-built event and a fake CMS behind
`fetch` that serves fixtures shaped exactly like the contract
(`src/lib/testing/`). They assert what each page is sent, including when the
CMS is down. The fixtures' content is made up: this repository is public, so
never put a real partner's details or member perk in a test.

Loads that read the database get an in-memory SQLite database built from
`drizzle/migrations` (`testDb()` in `src/lib/testing/db.ts`), seeded with
made-up members. Page data reaches every visitor's browser, so a load that
shows members selects only the columns its page shows (`src/lib/members.ts`),
and its test calls `expectNothingPrivate()`: no email, VATSIM Connect record,
row of the roster copy or hidden last name.

The roster refresh is tested through the cron job with a fake `{ getRoster }`
in place of the `TRAINING` binding (`src/lib/server/triggers/processRoster.test.ts`).
A migration that moves data is tested by building the database from the
migrations before it (`testDbBefore()`), inserting rows in the old shape, then
applying the rest.

## Deployment

Pushing to `main` deploys automatically. Manual deploy, which applies the remote D1 migrations first:

```bash
npm run build && npm run deploy
```

The roster cron deploys with the site; it is `triggers.crons` in `wrangler.jsonc`.

Production secrets (OAuth client secrets, `COMMUNITY_API_TOKEN`, `VATUSA_API_KEY`, the Discord webhooks) live in Cloudflare — set each with `wrangler secret put`.

## Disclaimer

We are not affiliated with the FAA or any aviation governing body. This software is for flight simulation use on the [VATSIM](https://www.vatsim.net) network.

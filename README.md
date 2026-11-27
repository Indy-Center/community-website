# community-website

SvelteKit app deployed to `flyindycenter.com`. Handles the public-facing community site — controller roster, events, feedback, visit requests, and admin tooling. Sign-in goes through the identity server (`id.flyindycenter.com`) over OAuth, or VATSIM Connect when `AUTH_PROVIDER` isn't `identity`; the site keeps its own sessions in a D1 database.

## Project layout

One SvelteKit app at the repository root, deployed as the `community-website` Worker. `src/worker.ts` is its entry point: it serves the site, and every 5 minutes its cron refreshes the roster (then syncs memberships and the booking system's roster and T2 from it) and sends booking reminders.

Routes:

- `src/hooks.server.ts` — auth gate; reads the `session` cookie, validates it against D1, populates `locals.user`, `locals.session`, `locals.roles` (for identity sessions, roles are refreshed from the identity server at most every 5 minutes). Also gives each request its CMS client, `locals.cms`, the CMS positions catalogue's reader, `locals.positions`, and the booking system's client, `locals.bookings` (undefined without its settings).
- `src/routes/+layout.server.ts` — every page's data: the signed-in member, their header name, roles, and the CMS positions catalogue that the layout hands to Centerline (`setPositions`).
- `src/routes/login`, `src/routes/logout` — sign-in and sign-out; `src/routes/login/connect/` starts the OAuth flow, `src/routes/login/identity/callback/` and `src/routes/login/connect/callback/` finish it.
- `src/routes/roster/` — controller roster page.
- `src/routes/staff/` — the staff page: who holds each staff position and team section.
- `src/routes/bookings/` — position bookings, on a calendar and a list; admins only for now. See [Bookings](#bookings).
- `src/routes/events/` — events listing; `[id]/` is one event, with position sign-up, `[id]/edit/` and `new/` edit and create events, `[id]/positions/` manages its roster, and `[id]/calendar.ics` downloads it.
- `src/routes/feedback/[[cid]]/` — pilot feedback submission, for a controller when a CID is given.
- `src/routes/staffing/` — staffing requests, posted to the Events Team's channel through Larry.
- `src/routes/visit/` — joining Indy Center: `become-a-controller/`, `become-community-member/` and `get-connected/`.
- `src/routes/partners/` — partner cards, from the CMS.
- `src/routes/partners/[slug]/` — one partner's page. Member perks go only to signed-in users; a guest's page data holds just how many there are.
- `src/routes/socials/` — the community's socials, with the Discord join button.
- `src/routes/contact/` — contact details.
- `src/routes/profile/` — the member's own profile, where they set their name, pronouns, bio and operating initials; see [The profile page](#the-profile-page). `discord/` starts Link Discord and `discord/callback/` finishes it; see [Linked accounts](#linked-accounts). `[cid]/` is a controller's public profile. `/settings` only redirects to `/profile?edit`.
- `src/routes/admin/` — admin tooling; role-gated. `users/` lists members and `users/[id]/` manages one; `feedback/` is the feedback review queue and `feedback/[id]/` reviews one item (see [Feedback review](#feedback-review)).

Server code, in `src/lib/server/`:

- `triggers/processRoster.ts` — the roster cron job: refreshes the roster copy from the training app, then syncs memberships and the booking system from it; syncs the staff points of contact from VATUSA.
- `triggers/remindBookings.ts` — the booking reminder cron job: DMs each controller through Larry before their booking.
- `roster.ts` — the roster refresh, and the reads of the stored credentials: the available credentials, and one CID's. `src/lib/credentials.ts` names and sorts credentials in the browser.
- `membership.ts` — membership sync; run for one user at sign-in, and for everyone by the cron job.
- `staff.ts` — who holds each staff position and team section, shared by the staff page, the roster and profiles.
- `session.ts` — the site's own sessions in D1, and their cookie.
- `identity.ts` — OAuth client for the identity server, its userinfo lookup, and the API calls under community's own client token (`clientToken`, `patchIdentityUser`, `writeOperatingInitials`), and the member's own profile save (`updateOwnProfile`); see "Identity API client". `identityCheck.ts` is the periodic userinfo check `hooks.server.ts` runs, and `oauth.ts` the VATSIM Connect client.
- `copyProfiles.ts` — copies members' profiles into identity (`scripts/copy-profiles-to-identity.ts`).
- `bookingsApi.ts` — the booking system's client: bookings, the roster and T2 endorsements. `bookings.ts` names the events bookings belong to.
- `bookingRoster.ts` — keeps the booking system's roster and T2 endorsements in step with the roster copy.
- `eventBookings.ts` — books event rosters on the booking calendar.
- `positions.ts` — reads the CMS positions catalogue. `keptReads.ts` keeps reads from other systems (the booking list, the catalogue) and serves them stale while those systems fail.
- `cms/` — the CMS client for the partners document. `partners.ts` reads that document as the visitor may see it (member perks in full if signed in, only a count for a guest), or null when the CMS is down and no copy is kept. Every page that shows partners reads through it.
- `larry.ts` — Larry's service binding: linked accounts, role syncs and channel names. `discord.ts` holds the Discord messages (the feedback alerts and posts Larry queues, and the older webhook helper), `discordLink.ts` Link Discord's sign-in, `socials.ts` the Discord join button's state, and `staffing.ts` the staffing request message.
- `feedback.ts` — feedback review helpers: the review log, reviewers, and how a pilot is named when feedback is published.
- `vatsim/` — VATSIM's data (events, METARs), VATSIM Connect, VATUSA (rosters, visiting, facility staff) and vNAS (who is online, and the ARTCC's facilities and positions).

## Design system

New UI uses [Indy Centerline](https://centerline.flyindycenter.com), following the
[design rules](https://tech.flyindycenter.com/design/): components from
`@indy-center/centerline-svelte`, and colours by role (`bg-card`, `text-foreground`,
`border-input`…) from `@indy-center/centerline-tokens`, imported in `src/app.css`. Older pages
still use Tailwind's `slate-*`/`gray-*`/`sky-*` directly; move them to roles when you touch them.

`colorSchemeHandle` in `src/hooks.server.ts` writes the member's light or dark choice (a cookie
shared across flyindycenter.com) on `<html>`. Until the older pages move to roles, the root
layout pins the site to dark with `data-theme="dark"`, since those pages are drawn in fixed dark
colours. Remove it, add `ColorSchemeSetting` to the user menu, and turn on the profile's Display
panel (greyed out until then), once they have.

## Bindings

| Binding               | Type             | Purpose                                                                                                                                                           |
| --------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DB`                  | D1               | Website-local data (sessions, the roster copy, etc.)                                                                                                              |
| `TRAINING`            | Service          | The training app's `TrainingRpc` entrypoint (`training-tools` Worker): the roster below                                                                           |
| `LARRY`               | Service          | Larry's Worker (`indy-larry`): Discord messages sent as the bot, such as staffing requests; the role sync's links and syncs ([Linked accounts](#linked-accounts)) |
| `ASSETS`              | Assets           | Static files from the SvelteKit build                                                                                                                             |
| `CF_VERSION_METADATA` | Version metadata | Build version tracking                                                                                                                                            |

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

Every page names a member through `memberName` in `src/lib/members.ts`: their preferred name;
else, with name privacy, their first name and CID ("Jordan 1000001"); else their first and last
name. A page any visitor sees sends that name (`shownMember`), never the name columns, and no page
works a private name out itself.

## The profile page

`/profile` is the signed-in member's own profile: the header, About you (the bio) and, for
controllers, their feedback, with Linked accounts and Display beside them. **Edit profile**
(`/profile?edit`; a link such as `/profile?edit#controlling` lands on a field) swaps the header and
About for one form, saved all at once: the name choice ("Show my name as"), pronouns, bio and, for
controllers, operating initials. `/settings` redirects there; its old form is gone.

- **Where each field is held:** identity holds the preferred name, pronouns and operating
  initials; the site keeps copies in `users` for its other pages, and holds the bio itself. The
  name choice is stored only as the preferred name it produces (`src/lib/profile/nameChoice.ts`).
  Full name saves `null`, so the name follows VATSIM, except for a member with name privacy: there
  `null` means "keep it private", so their full name is saved as text, and identity's `name`,
  community's pages and larry's nickname all show it. It then doesn't follow a VATSIM name change
  until they save again.
- **Reading:** each visit reads the member's values from identity's `/oauth/userinfo`. If identity
  can't be reached, the page shows the local copies and the form is turned off. The 5-minute
  userinfo check in `hooks.server.ts` (`src/lib/server/identityCheck.ts`) also copies identity's
  values into the member's row when they differ, except where identity holds none and the row
  holds one (a member the one-time copy skipped because identity didn't know them yet). That value
  is written to identity and kept, also at sign-in; if identity refuses, it is still kept and the
  next check tries again. The page shows such a value while it waits.
- **Saving**, each step only if its fields changed: the initials through `writeOperatingInitials`
  (the API client), then the preferred name and pronouns through `PATCH /api/me` with the member's
  own session token (`updateOwnProfile`), then the `users` row. If any step fails, the identity
  writes already made are undone, newest first, so identity holds what it did before, and nothing
  is reported as saved. A successful save says so in a toast.
- **Discord:** after a name change, the page asks larry to sync the member (`syncMembers` on the
  `LARRY` binding), so their nickname follows. It reads whether they have a Discord account with
  `getLinks`. A larry failure is logged and doesn't fail the save.

### Linked accounts

The panel beside both modes shows which Discord account the role sync uses for the member, from
larry's `getLinks` (read through `readLinks` in `src/lib/server/larry.ts`). Every change goes through
larry on the `LARRY` binding, for the session's CID only: the site never writes a link itself. If
larry can't be asked, the panel says "Links are unavailable right now." and the rest of the page
works. The TeamSpeak row is under Discord's.

Each button comes back to `/profile` with what happened as a Centerline toast (`setAccountsFlash`
in `src/lib/server/discordLink.ts`): a success, a note ("Your roles will update in a minute.") or
larry's refusal (`danger`). Each is the result of an action just taken, and the row already shows
what changed, so nothing stays on the panel; Centerline keeps Alert for something that stays until
it's fixed. The only Alert on the panel is "Links are unavailable right now." The site's one
`<Toaster />` is in the root layout.

- **The Discord row**, laid out like TeamSpeak's (heading and button on one line, the text below):
  the member's own link ("Linked: @name", with **Unlink**, the `unlink` action calling
  `unlink(cid, 'discord')`), VATUSA's account ("Linked on VATUSA", with
  **Use a different account**), or none ("No Discord account", with **Link Discord**).
- **Link Discord** (`/profile/discord`) is a Discord sign-in through the "Indy Center" Discord app
  (`DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`), asking for `identify guilds.join`, with its state
  in a 10-minute cookie. The app's redirects must include `<origin>/profile/discord/callback`.
- **The callback** (`/profile/discord/callback`) checks the state, exchanges the code, reads the
  account from Discord's `/users/@me`, and calls `linkDiscord(cid, id, accessToken)`; larry links
  it and adds the member to the Indy Center Discord if they aren't in it (`joined`). The access token
  goes to larry once and is never stored or logged. It returns to `/profile`, whose toast says what
  happened: who it linked and whether they were added, larry's refusal as larry words it, or
  "Discord didn't confirm the account. Try again." for a bad state or a cancelled or failed sign-in.
  Without the two Discord settings, Link Discord says the same and logs why.
- **The TeamSpeak row** shows the member's identity shortened to its first and last four
  characters, with **Unlink** (the same `unlink` action, posting `service=teamspeak`; "TeamSpeak
  unlinked."), or, when
  there is none, how to connect: **Connect to TeamSpeak** (`https://tmspk.gg/s/ZID`, in a new tab)
  and "or type ZID in TeamSpeak's server address box". Nothing is sent to
  larry from the not-linked row: the member connects, larry's TeamSpeak bot messages them a link,
  and only that link links an identity.
- **The TeamSpeak link** (`/profile?ts=<token>`) only asks: Centerline's `ConfirmDialog` opens over
  the profile, "Link your TeamSpeak identity?", with **Link TeamSpeak** and **Cancel** (or Escape,
  or a click outside, which drop `?ts=` from the address). Opening it calls nothing, because larry links
  whichever identity the token names to whoever confirms it: a link sent to someone else would give
  the sender's TeamSpeak that member's groups. **Link TeamSpeak** posts the `linkTeamspeak` action,
  which calls `confirmTsLink(cid, token)` for the session's CID and comes back to `/profile` with
  "TeamSpeak linked." or larry's refusal as larry words it (an expired or used link, another
  member's identity). Signed out, it goes through sign-in and returns with `?ts=` kept.
- **Sync my roles**, at the panel's foot, calls `syncMembers([cid])` for the member (the
  `syncRoles` action): "Your roles will update in a minute.", or larry's reason when it declines.
  **Sync roles** on the admin user page (`/admin/users/[id]`, admins only; anyone else gets 403)
  does the same for that user.

The card's message is carried over the redirect in a 60-second `profile_accounts` cookie, shown
once. The edit form posts to `?edit&/save`, since the page has named actions.

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

## Event briefings

Event managers get a **Send briefing** button on an event with a roster. Larry posts the briefing
in `controller-announcements`. The post has the event's name, linked to its page, its start time,
the manager's text and the roster, facility by facility, with each vacant position on its own
line. An optional link to the brief shows as an "Open brief" button. The modal's counter takes
everything but the text off Discord's 2000 characters, so a briefing is always sent as one
message.

Sending first syncs the event's Discord role, `Event: <name>`, with Larry's `syncRoles()`. The
role holds exactly the roster's controllers who have a Discord account in the server. The post
pings that role and nobody else. The manager is told who the ping missed.

Larry's message IDs and the role's ID are kept in `event_briefings`. After that, every roster
change (assigning, signing up, adding or removing a position) and every event edit queues an edit
of the post (`enqueueEdit()`, which pings nobody) and re-syncs the role. If the roster outgrows
the message, it moves into messages of its own. The code is in `src/lib/server/eventBriefing.ts`,
and the message is built in `src/lib/utils/briefing.ts`.

Once an event ends, its post stays as it was: roster changes no longer edit it, and a briefing
can't be sent. Events are never deleted, so the 5-minute cron deletes the role of every event
that has ended (`src/lib/server/eventRoles.ts`). Deleting an event deletes its role straight away.
The post always stays.

Larry's deploy needs `controller-announcements:<channel ID>` in `SEND_CHANNELS`. The bot needs to
post there and needs Manage Roles. It also needs the Server Members intent, or Larry can add people
to the role but never remove them.

## Event booking problems

When the booking system won't book, cancel or move an event position, the roster change still
saves. The error is kept in `event_booking_problems` (`src/lib/server/eventBookings.ts`). Event
managers see it in a banner on the event page and on Edit Positions, with a button to copy the
errors for the tech team. A problem clears when that position next syncs for the same
controller, or when a manager dismisses it. Events longer than 18 hours (`LONG_EVENT_HOURS`) get a
warning on the form and the event page, since a long event is often a mistyped date.

## Vars and secrets for the CMS

Partners are edited in the CMS (Payload, at `cms.flyindycenter.com`) and read
from its `GET /api/community/partners` by `src/lib/server/cms/`. The other
CMS read is the public positions catalogue, by `src/lib/server/positions.ts`;
see [Bookings](#bookings).

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

## Identity API client

Community writes members' operating initials to identity through `PATCH /api/users/{cid}`, and the
one-time copy below writes their preferred names and pronouns there too. Those calls are made as its
own registered client, `community-api`, which is separate from `community-web`, the client that signs members in. Identity's
operator registers it with the `users:write` scope and no redirect URIs. Its id is the
`IDENTITY_API_CLIENT_ID` var in `wrangler.jsonc`; its secret is the `IDENTITY_API_CLIENT_SECRET` secret.
Sign-in's `IDENTITY_CLIENT_ID` and `IDENTITY_CLIENT_SECRET` are not involved.

`clientToken()` in `src/lib/server/identity.ts` gets a client-credentials token from
`POST {IDENTITY_URL}/oauth/token` (`grant_type=client_credentials`). It keeps the token in memory until
a minute before its `expires_in` (identity issues one hour) and fetches a new one once if identity
answers an API call with 401. With the secret unset it throws "identity API client isn't configured",
and callers log that and carry on as they do when identity refuses. Every call to identity's
`/api/users/*` endpoints (`patchIdentityUser`) takes its token from `clientToken()`; don't fetch
another. The exception is `PATCH /api/me`, the profile save's `updateOwnProfile`: identity refuses a
client token there, so it uses the member's own session token.

A leaver keeps their operating initials, locally and in identity.

### The one-time copy into identity

`npm run copy-profiles` copies what community holds today into identity: each member's preferred
name, pronouns and operating initials, one `PATCH /api/users/{cid}` per member. It is run once by
the maintainer, **straight before the profile page deploys**, never after.

Run it before because the deployed site copies identity's values into each signed-in member's
`users` row (the 5-minute userinfo check, `src/lib/server/identityCheck.ts`), and the copy reads
those rows. Deployed first, every member active before the copy would have their preferred name,
pronouns and initials overwritten with identity's empty values, leaving the copy nothing to send,
and the next roster run would hand controllers new initials. Run first, identity already holds the
same values, so the check changes nothing. Deploy as soon as it finishes: a change saved on the old
`/settings` page in between stays only in community and is overwritten by the check. **Don't run
it again after the deploy:** a member with VATUSA name privacy who then chooses their full name has
it saved as text, and the copy would take that for an old pre-filled name and clear it.

It runs outside the Worker under `vite-node`, with `process.env` standing in for the
Worker's `env`, and writes through `patchIdentityUser()` and `clientToken()` in
`src/lib/server/identity.ts` like the site does, so the API client above is the one it uses.

1. Export training's teacher initials (from the training-tools repo, whose database is its own):

   ```bash
   npx wrangler d1 execute <training database name> --remote --json \
     --command "SELECT cid, initials FROM teachers WHERE initials IS NOT NULL" \
     | node -e 'process.stdout.write(JSON.stringify(JSON.parse(require("fs").readFileSync(0))[0].results))' \
     > teachers.json
   ```

   The file is a JSON array of `{ "cid", "initials" }`. Don't commit it.

2. Export the API client's settings, then do a dry run first. It reads community's production D1
   through `wrangler d1 execute website-db --remote` (read only) and prints every patch without
   sending any:

   ```bash
   export IDENTITY_API_CLIENT_ID=community-api IDENTITY_API_CLIENT_SECRET=<secret>
   npm run copy-profiles -- --dry-run --teachers teachers.json
   ```

3. Run it for real by leaving out `--dry-run`. Until the deploy it can be run again: it overwrites
   what identity holds.

4. Deploy the profile page straight away.

The rules, for each `users` row with a CID:

- Preferred name: empty sends nothing; equal to first and last name (trimmed, any case) sends
  `null` and is cleared in community's row too, even for a member identity doesn't know (the old
  settings page pre-filled it, so it wasn't a choice); otherwise it is sent as typed, cut to 64
  characters.
- Pronouns: trimmed, empty sends `null`, cut to 32.
- Initials: the teacher file's pair for that CID, else `users.operating_initials`. Only `^[A-Z]{2}$`
  is sent; a malformed pair is skipped. When the teacher's pair differs from community's, the local
  row is updated to match after identity accepts it.
- Bios stay in community.
- A teacher in the file with no `users` row (they've never signed in to community) gets nothing
  copied and is listed with their initials, as is a teacher row with empty initials. Staff set
  those in identity by hand, or the teacher does on their profile after signing in.
- A member identity doesn't know (404) is skipped and listed. Any other refusal is listed with its
  error, and the run carries on.

At the end it prints how many members were patched, full names dropped, cuts, members skipped
as unknown or malformed, teachers with no account or empty initials, members identity refused,
and local initials updated, with the lists.

## Local development

From the repository root:

```bash
npm install
touch .env    # then add the secrets below that you need
npm run dev   # applies local D1 migrations, then serves http://localhost:5173
```

There is no `.env` template. The vars in `wrangler.jsonc` cover the rest; set these in `.env` for the features you're working on:

- `IDENTITY_CLIENT_SECRET` — sign-in through the identity server (`IDENTITY_URL` points it at another one). `CONNECT_CLIENT_SECRET` instead when `AUTH_PROVIDER` isn't `identity`.
- `IDENTITY_API_CLIENT_SECRET` — writes to identity; see "Identity API client". Without it those writes are refused locally and logged.
- `CMS_URL`, `COMMUNITY_API_TOKEN` — partners; see above.
- `VATUSA_API_KEY` — VATUSA API calls, such as adding a visitor. (The roster comes from the training app.)
- `VATSIM_BOOKING_API_URL`, `VATSIM_BOOKING_API_KEY` — the booking system: its base URL (including `/api`) and our organization's API key. In production they are a GitHub repo variable and secret, which the deploy passes to the Worker (see [Deployment](#deployment)). Without both the bookings page loads empty and booking is disabled; see [Bookings from a fake booking system](#bookings-from-a-fake-booking-system) to try it locally.
- `VATSIM_BOOKING_T2_RESTRICTION_ID` — the booking system's Indy Center (T2) restriction, created once; T2 sync is off without it. A GitHub repo variable, which the deploy passes to the Worker. See [Roster and T2 in the booking system](#roster-and-t2-in-the-booking-system).
- `DISCORD_WEBHOOK_SENIOR_STAFF_ALERTS`, `DISCORD_WEBHOOK_TECH_TEAM_ALERTS` — Discord alerts.
- `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` — Link Discord on the profile, through the "Indy Center" Discord app; see [Linked accounts](#linked-accounts). Without them Link Discord says Discord didn't confirm the account.

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

The fake also answers the profile page and its Linked accounts panel, typed from the installed
`@indy-center/indy-larry-worker`:

- `getLinks` gives a member's own link if they made one since the fake started, else a Discord
  account known from VATUSA.
- `linkDiscord` links in memory, answering `joined: true` the first time an account is linked
  with a token and `false` after, and refuses an account another member holds, as Larry does.
- `confirmTsLink` links a made-up TeamSpeak identity for any token, except `used` (larry's
  expired-link message) and `taken` (another member's identity), so `/profile?ts=anything` works.
- `unlink` forgets the link.
- `syncMembers` queues a sync, declining a CID synced in the last 2 minutes as Larry does.

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

## Bookings

`/bookings` shows ZID's bookings on a calendar and a list, and lets rostered controllers book
positions in the booking system (a VATSIM ATC booking calendar). The site talks to it directly
through `src/lib/server/bookingsApi.ts`; see the settings above and the fake below.

- **Admins only for now.** While `BOOKINGS_ADMIN_ONLY` in `src/lib/config/bookings.ts` is `true`,
  `/bookings`, its nav link and the home page's "Controllers Starting Soon" panel are for admins
  alone. Set it to `false` to open them to every member.
- **Positions.** The root layout reads the CMS positions catalogue (`locals.positions`, kept for 5
  minutes and served for 7 days while the CMS is failing) and hands it to Centerline with
  `setPositions`. Every place a position is named uses `<Position callsign>`; where a component
  can't go (a confirm dialog, an aria-label, the Discord reminder), `positionText` words it the same
  way. Retired positions are never offered. Positions sort TMU first, then Center,
  Approach/Departure, Tower, Ground, Ramp and Clearance.
- **Certifications.** The site decides who may book what; the booking system only checks T2 (see
  below). The rules are in code, `getSopRequirements` in `src/lib/utils/bookings.ts`: S-GC for
  ground and S-LC for tower at the simple ATCTs of SOP 3.20 (`SIMPLE_ATCT_FACILITIES`), A-GC and A-LC
  at every other ATCT, S-GC for clearance, T-RC for approach and E-RC with T2-CTR for center. They
  replace the CMS's `requiredCredentials`, which don't follow the SOP yet; once the CMS does, drop
  them and read the CMS's again (a TODO in `src/lib/config/bookings.ts` says so).
- **Writes.** A booking, change or cancel waits for the booking system's answer. When it refuses
  (an overlap, say), the booker sees its reason. The site also refuses overlaps itself, and keeps
  the booking list for 30 seconds so pages don't spend the booking system's rate limit (100 requests
  per 15 minutes); a write clears it.
- **Mentors** (VATUSA `ATM`, `DATM`, `TA`, `INS` or `MTR`) can also book for any other rostered
  controller: the booking goes in as `training` under the student's CID, on a position the mentor
  holds, and mentors can change or cancel any training booking.
- **Event rosters.** Once an event's roster is out, each assigned controller is booked on their
  position for the event's hours, as an `event` booking (`src/lib/server/eventBookings.ts`).
  Changes to the roster, the event's hours or its publishing follow; these bookings are changed
  from the event, not from `/bookings`.
- **Reminders.** The five-minute cron DMs each booked controller through Larry three hours before
  their booking starts (`src/lib/server/triggers/remindBookings.ts`).
- **What the booking system holds for us.** The **Read our booking positions** workflow (Actions tab,
  run by hand, read-only) shows our org's bookable position list and its GCAP restrictions from
  `GET /org/positions`, using the same repo variable and secret as the deploy. **Read our booking roster** does the same for
  `GET /org/members`, to check what the roster cron has pushed.

## Bookings from a fake booking system

To try bookings without the real key, run `dev/fake-bookings/`, a stand-in for the booking
system's API that starts with no bookings, and point the site at it in `.env`:

```bash
npm run dev:bookings           # the fake booking system, on port 8790
```

```
VATSIM_BOOKING_API_URL=http://localhost:8790/api
VATSIM_BOOKING_API_KEY=anything
```

Bookings sit in its memory and reset when it stops. Like the real one, it refuses a booking that
overlaps another on the same position, and the site shows its reason. Without both settings the
page loads empty and booking is disabled.

### Roster and T2 in the booking system

The booking system keeps its own copy of our roster and of who holds T2. We don't use its portal,
so the roster cron (`src/lib/server/bookingRoster.ts`) keeps both in step after each good roster
refresh, every five minutes:

- **Roster.** Every rostered controller, home and visiting, goes with their rating, `isHome` (from
  VATUSA's home roster) and `isMentor` (VATUSA's `ATM`, `DATM`, `TA`, `INS` or `MTR` role), all as members. Every field is
  sent every time, because the booking system fills in what is left out (home, not a mentor). The
  roster is sent only when it differs, and the booking system removes anyone left off it.
- **T2.** Every rostered controller holding `T2-CTR` is endorsed on the Indy Center restriction
  (`IND_*_CTR`), and anyone else's endorsement is revoked. The restriction is created once, by the
  **Create the T2 restriction** workflow (Actions tab, run by hand; it uses the same repo variable `VATSIM_BOOKING_API_URL` and secret `VATSIM_BOOKING_API_KEY` as the deploy). Its run summary gives the ID, which goes in the repo variable `VATSIM_BOOKING_T2_RESTRICTION_ID`; T2 sync is off until it is set and the site redeployed.

With the fake, create the restriction and put its ID in `.env`:

```bash
curl -s -X POST http://localhost:8790/api/org/session/restrictions -H 'Authorization: Bearer x' \
  -H 'Content-Type: application/json' -d '{"name":"Indy Center","tier":"T2","patterns":"IND_*_CTR"}'
```

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

Production secrets (OAuth client secrets, `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET`, `COMMUNITY_API_TOKEN`, `VATUSA_API_KEY`, the Discord webhooks) live in Cloudflare — set each with `wrangler secret put`. The booking system's settings are the exception: `VATSIM_BOOKING_API_URL` and `VATSIM_BOOKING_T2_RESTRICTION_ID` are GitHub repo variables and `VATSIM_BOOKING_API_KEY` a repo secret (Settings → Secrets and variables → Actions), and the deploy workflow passes them to the Worker.

## Disclaimer

We are not affiliated with the FAA or any aviation governing body. This software is for flight simulation use on the [VATSIM](https://www.vatsim.net) network.

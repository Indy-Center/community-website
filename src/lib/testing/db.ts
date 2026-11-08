import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { expect } from 'vitest';
import { schema, type Database } from '$lib/server/db';
import {
	eventPositionRequestsTable,
	eventPositionsTable,
	eventsTable
} from '$lib/db/schema/events';
import { usersTable } from '$lib/db/schema/users';
import {
	availableCredentialsTable,
	vatsimControllersTable
} from '$lib/db/schema/vatsimControllers';
import type { AvailableCredential } from '$lib/credentials';

const MIGRATIONS = 'drizzle/migrations';

/**
 * An empty site database in memory, built from the same migrations as D1. Typed as the site's
 * `Database`: the libsql and D1 drivers share Drizzle's SQLite query API.
 */
export async function testDb(): Promise<Database> {
	const db = drizzle(createClient({ url: ':memory:' }), { schema });
	await migrate(db, { migrationsFolder: MIGRATIONS });
	return db as unknown as Database;
}

/**
 * For a migration's test: a database in memory built from the migrations before the one tagged
 * `tag` (its file name without `.sql`), so the test can insert rows in the old shape. `migrate()`
 * then applies the rest.
 */
export async function testDbBefore(tag: string) {
	const journal = JSON.parse(readFileSync(join(MIGRATIONS, 'meta/_journal.json'), 'utf8')) as {
		entries: { tag: string }[];
	};
	const index = journal.entries.findIndex((entry) => entry.tag === tag);
	if (index === -1) throw new Error(`No migration tagged ${tag}`);

	const earlier = mkdtempSync(join(tmpdir(), 'migrations-'));
	mkdirSync(join(earlier, 'meta'));
	const entries = journal.entries.slice(0, index);
	writeFileSync(join(earlier, 'meta/_journal.json'), JSON.stringify({ ...journal, entries }));
	for (const entry of entries) {
		copyFileSync(join(MIGRATIONS, `${entry.tag}.sql`), join(earlier, `${entry.tag}.sql`));
	}

	const client = createClient({ url: ':memory:' });
	const db = drizzle(client, { schema });
	await migrate(db, { migrationsFolder: earlier });
	rmSync(earlier, { recursive: true });

	return {
		client,
		db: db as unknown as Database,
		migrate: () => migrate(db, { migrationsFolder: MIGRATIONS })
	};
}

/** A member's site account: the user row VATSIM Connect sign-in leaves, plus what they set. */
export type SeedUser = {
	id: string;
	email: string;
	preferredName?: string;
	operatingInitials?: string;
	membership?: 'basic' | 'community' | 'controller';
};

/** A member as `seedMember` takes them: their roster row's fields, and their site account. */
export type SeedMember = {
	cid: string;
	firstName: string;
	lastName: string;
	namePrivacy?: boolean;
	rating?: string;
	joined?: string | null;
	/** VATUSA facility role codes held at ZID, e.g. `ATM`. */
	roles?: string[];
	/** Code of the certification held, as the training app sends it. */
	certification?: string | null;
	endorsements?: string[];
	/** False for someone with a site account who isn't on the controller roster. */
	onRoster?: boolean;
	user?: SeedUser;
};

/**
 * Seeds a member: their row in the roster copy (with their credentials), unless `onRoster` is
 * false, and their site account if `user` is given. Every member here is made up; the repository
 * is public. Seed the available credentials with `seedAvailableCredentials`.
 */
export async function seedMember(db: Database, member: SeedMember) {
	const { cid, firstName, lastName, user } = member;

	if (member.onRoster !== false) {
		await db.insert(vatsimControllersTable).values({
			cid,
			firstName,
			lastName,
			namePrivacy: member.namePrivacy ?? false,
			rating: member.rating ?? 'S2',
			facilityJoinedAt: member.joined === undefined ? '2024-01-15T00:00:00+00:00' : member.joined,
			roles: member.roles ?? [],
			certification: member.certification ?? null,
			endorsements: member.endorsements ?? []
		});
	}

	if (!user) return;

	await db.insert(usersTable).values({
		id: user.id,
		cid,
		firstName,
		lastName,
		email: user.email,
		preferredName: user.preferredName ?? null,
		operatingInitials: user.operatingInitials ?? null,
		membership: user.membership ?? 'controller',
		data: {
			cid,
			personal: {
				name_first: firstName,
				name_last: lastName,
				name_full: `${firstName} ${lastName}`,
				email: user.email,
				country: { id: 'US', name: 'United States' }
			},
			vatsim: {
				rating: { id: 3, long: 'Ground Controller', short: member.rating ?? 'S2' },
				pilotrating: { id: 0, long: 'New Member', short: 'NEW' },
				division: { id: 'USA', name: 'United States' },
				region: { id: 'AMAS', name: 'Americas' },
				subdivision: { id: 'ZID', name: 'Indianapolis' }
			}
		}
	});
}

/** Seeds a published event with an assigned roster, its positions and position requests. */
export async function seedEvent(
	db: Database,
	event: {
		id: string;
		positions: { position: string; userId: string | null }[];
		requests?: { id: string; userId: string; comments: string }[];
	}
) {
	await db.insert(eventsTable).values({
		id: event.id,
		name: 'Example Fly-In',
		type: 'home',
		rosterType: 'assigned',
		description: 'A made-up event.',
		startTime: new Date('2026-11-01T23:00:00Z'),
		endTime: new Date('2026-11-02T02:00:00Z'),
		isPublished: true,
		isRosterPublished: true
	});
	for (const position of event.positions) {
		await db.insert(eventPositionsTable).values({ eventId: event.id, ...position });
	}
	for (const request of event.requests ?? []) {
		await db.insert(eventPositionRequestsTable).values({ eventId: event.id, ...request });
	}
}

/** The available credentials as tests seed them: made up in shape, in the training app's order. */
export const AVAILABLE_CREDENTIALS: AvailableCredential[] = [
	{ code: 'S-GC', kind: 'certification', name: 'Simple Ground Control', order: 1 },
	{ code: 'A-LC', kind: 'certification', name: 'Advanced Local Control', order: 2 },
	{ code: 'T-RC', kind: 'certification', name: 'Terminal Radar Control', order: 3 },
	{ code: 'E-RC', kind: 'certification', name: 'Enroute Radar Control', order: 4 },
	{ code: 'S-LC', kind: 'endorsement', name: 'Simple Local Control', order: 5 },
	{ code: 'T2-CTR', kind: 'endorsement', name: 'Tier 2 Center', order: 6 }
];

/** Seeds the available credentials, as the roster refresh stores them. */
export async function seedAvailableCredentials(
	db: Database,
	credentials: AvailableCredential[] = AVAILABLE_CREDENTIALS
) {
	await db.insert(availableCredentialsTable).values(credentials);
}

/**
 * Fails if page data holds anything a visitor must not get: any member's email, a VATSIM
 * Connect record (a user row's `data`: `personal`, `vatsim`) or a row of the roster copy
 * (`namePrivacy`), or one of `hiddenNames`, the last names of members with VATUSA name privacy
 * set. It looks for the records' own keys, since superforms sends a `data` key too.
 */
export function expectNothingPrivate(pageData: unknown, hiddenNames: string[] = []) {
	const sent = JSON.stringify(pageData);
	expect(sent).not.toMatch(/@/);
	expect(sent).not.toMatch(/"(email|personal|vatsim|namePrivacy)":/);
	for (const name of hiddenNames) expect(sent).not.toContain(name);
}

import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { expect } from 'vitest';
import { schema, type Database } from '$lib/server/db';
import { userCertificationsTable } from '$lib/db/schema/certifications';
import { userEndorsementsTable } from '$lib/db/schema/endorsements';
import {
	eventPositionRequestsTable,
	eventPositionsTable,
	eventsTable
} from '$lib/db/schema/events';
import { usersTable } from '$lib/db/schema/users';
import { vatsimControllersTable } from '$lib/db/schema/vatsimControllers';
import type { VatusaRosterMember } from '$lib/types/vatusa';

/**
 * An empty site database in memory, built from the same migrations as D1. Typed as the site's
 * `Database`: the libsql and D1 drivers share Drizzle's SQLite query API.
 */
export async function testDb(): Promise<Database> {
	const db = drizzle(createClient({ url: ':memory:' }), { schema });
	await migrate(db, { migrationsFolder: 'drizzle/migrations' });
	return db as unknown as Database;
}

/** A member's site account: the user row VATSIM Connect sign-in leaves, plus what they set. */
export type SeedUser = {
	id: string;
	email: string;
	preferredName?: string;
	operatingInitials?: string;
	membership?: 'basic' | 'community' | 'controller';
	certifications?: string[];
	endorsements?: string[];
};

/**
 * Seeds a member: their VATUSA roster row, unless `onRoster` is false, and their site account if
 * `user` is given. Every member here is made up; the repository is public.
 */
export async function seedMember(
	db: Database,
	member: {
		cid: string;
		fname: string;
		lname: string;
		namePrivacy?: boolean;
		rating?: string;
		joined?: string;
		onRoster?: boolean;
		user?: SeedUser;
	}
) {
	const { cid, fname, lname, user } = member;

	if (member.onRoster !== false) {
		await db.insert(vatsimControllersTable).values({
			cid,
			data: vatusaRow({
				cid: Number(cid),
				fname,
				lname,
				flag_nameprivacy: member.namePrivacy ?? false,
				rating_short: member.rating ?? 'S2',
				facility_join: member.joined ?? '2024-01-15T00:00:00+00:00',
				email: user?.email ?? null
			})
		});
	}

	if (!user) return;

	await db.insert(usersTable).values({
		id: user.id,
		cid,
		firstName: fname,
		lastName: lname,
		email: user.email,
		preferredName: user.preferredName ?? null,
		operatingInitials: user.operatingInitials ?? null,
		membership: user.membership ?? 'controller',
		data: {
			cid,
			personal: {
				name_first: fname,
				name_last: lname,
				name_full: `${fname} ${lname}`,
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
	for (const certification of user.certifications ?? []) {
		await db.insert(userCertificationsTable).values({ userId: user.id, certification });
	}
	for (const endorsement of user.endorsements ?? []) {
		await db.insert(userEndorsementsTable).values({ userId: user.id, endorsement });
	}
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

function vatusaRow(row: Partial<VatusaRosterMember>): VatusaRosterMember {
	return {
		cid: 0,
		fname: '',
		lname: '',
		email: null,
		facility: 'ZID',
		rating: 3,
		created_at: '2024-01-01T00:00:00+00:00',
		updated_at: '2024-01-01T00:00:00+00:00',
		flag_needbasic: false,
		flag_xferOverride: false,
		facility_join: '2024-01-15T00:00:00+00:00',
		flag_homecontroller: true,
		lastactivity: '2026-10-01T00:00:00+00:00',
		flag_broadcastOptedIn: null,
		flag_preventStaffAssign: null,
		discord_id: 0,
		last_cert_sync: '2026-10-01T00:00:00+00:00',
		flag_nameprivacy: false,
		last_competency_date: null,
		promotion_eligible: false,
		transfer_eligible: null,
		roles: [],
		rating_short: 'S2',
		isMentor: false,
		isSupIns: false,
		last_promotion: null,
		membership: 'home',
		...row
	};
}

/**
 * Fails if page data holds anything a visitor must not get: any member's email, a VATSIM
 * Connect record (`personal`) or VATUSA roster row (`fname`, `flag_nameprivacy`), or one of
 * `hiddenNames`, the last names of members with VATUSA name privacy set.
 */
export function expectNothingPrivate(pageData: unknown, hiddenNames: string[] = []) {
	const sent = JSON.stringify(pageData);
	expect(sent).not.toMatch(/@/);
	expect(sent).not.toMatch(/"(email|personal|fname|lname|flag_nameprivacy)":/);
	for (const name of hiddenNames) expect(sent).not.toContain(name);
}

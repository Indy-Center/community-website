import { fail } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { FACILITY_ID } from '$lib/config';
import {
	STAFF_POSITIONS,
	STAFF_TEAMS,
	STAFF_TEAM_SECTIONS,
	isManualOnlyPosition
} from '$lib/config/staff';
import {
	staffAssignmentsTable,
	staffBiosTable,
	staffEmailsTable,
	staffTeamMembersTable
} from '$lib/db/schema/staff';
import type { Database } from '$lib/server/db';
import { logger } from '$lib/server/logger';
import { isAdmin } from '$lib/utils/permissions';

const POSITION_KEYS = STAFF_POSITIONS.map((position) => position.key) as [string, ...string[]];
const TEAM_KEYS = STAFF_TEAMS.map((team) => team.key) as [string, ...string[]];
const SECTION_KEYS = STAFF_TEAM_SECTIONS.map((section) => section.key) as [string, ...string[]];
const CARD_KEYS = [...POSITION_KEYS, ...TEAM_KEYS] as [string, ...string[]];
const MAX_BIO_LENGTH = 1000;

type RosterMember = Awaited<ReturnType<typeof getRoster>>[number];

function getRoster(db: Database) {
	return db.query.vatsimControllersTable.findMany({ with: { user: true } });
}

function getDisplayName(member: RosterMember) {
	return (
		member.user?.preferredName ??
		`${member.data.fname} ${member.data.flag_nameprivacy ? member.data.cid : member.data.lname}`
	);
}

// CIDs holding a role according to VATUSA facility roles
function getVatusaHolders(roster: RosterMember[], role: string) {
	return roster
		.filter((member) =>
			member.data.roles?.some((r) => r.facility === FACILITY_ID && r.role === role)
		)
		.map((member) => member.cid);
}

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);

export const load = async ({ locals }) => {
	const [roster, assignments, teamRows, bios, emailRows] = await Promise.all([
		getRoster(locals.db),
		locals.db.query.staffAssignmentsTable.findMany(),
		locals.db.query.staffTeamMembersTable.findMany(),
		locals.db.query.staffBiosTable.findMany(),
		locals.db.query.staffEmailsTable.findMany()
	]);

	const getEmails = (key: string) => emailRows.find((row) => row.key === key)?.emails ?? [];

	const offRosterCids = [...assignments, ...teamRows]
		.map((row) => row.cid)
		.filter((cid) => !roster.some((member) => member.cid === cid));
	// Manually added staff who aren't on the roster fall back to their site account
	const offRosterUsers = offRosterCids.length
		? await locals.db.query.usersTable.findMany({
				where: (users, { inArray }) => inArray(users.cid, offRosterCids)
			})
		: [];

	function describe(cid: string) {
		const member = roster.find((m) => m.cid === cid);
		const bio = bios.find((b) => b.cid === cid)?.bio ?? null;
		if (member) {
			return {
				cid,
				name: getDisplayName(member),
				rating: member.data.rating_short,
				operatingInitials: member.user?.operatingInitials ?? null,
				bio
			};
		}

		const user = offRosterUsers.find((u) => u.cid === cid);
		return {
			cid,
			name: user ? (user.preferredName ?? `${user.firstName} ${user.lastName}`) : cid,
			rating: null,
			operatingInitials: user?.operatingInitials ?? null,
			bio
		};
	}

	function getPositionHolders(position: string) {
		const manual = assignments.filter((a) => a.position === position).map((a) => a.cid);
		if (isManualOnlyPosition(position) || manual.length > 0) return manual;
		return getVatusaHolders(roster, position);
	}

	const staff = STAFF_POSITIONS.map((position) => ({
		...position,
		manualOnly: isManualOnlyPosition(position.key),
		isManual: assignments.some((a) => a.position === position.key),
		emails: getEmails(position.key),
		members: getPositionHolders(position.key).map(describe).sort(byName)
	}));

	const teams = STAFF_TEAMS.map((team) => {
		const leads = getPositionHolders(team.lead);

		return {
			...team,
			emails: getEmails(team.key),
			leads: leads.map(describe).sort(byName),
			sections: team.sections.map((section) => {
				// Manual membership changes are stored under the section key
				const rows = teamRows.filter((row) => row.team === section.key);
				const cids = new Set([
					...(section.vatusaRole ? getVatusaHolders(roster, section.vatusaRole) : []),
					...rows.filter((row) => !row.excluded).map((row) => row.cid)
				]);
				for (const row of rows) if (row.excluded) cids.delete(row.cid);
				for (const cid of leads) cids.delete(cid);

				return { ...section, members: [...cids].map(describe).sort(byName) };
			})
		};
	});

	return {
		staff,
		teams,
		canEdit: isAdmin(locals.roles),
		controllers: isAdmin(locals.roles)
			? roster.map((member) => ({ cid: member.cid, name: getDisplayName(member) })).sort(byName)
			: []
	};
};

const cidSchema = z.string().regex(/^\d+$/);

const assignmentSchema = z.object({
	position: z.enum(POSITION_KEYS),
	cid: cidSchema
});

const positionSchema = z.object({
	position: z.enum(POSITION_KEYS)
});

const teamMemberSchema = z.object({
	team: z.enum(SECTION_KEYS),
	cid: cidSchema
});

const emailsSchema = z.object({
	key: z.enum(CARD_KEYS),
	emails: z
		.string()
		.transform((value) => [
			...new Set(
				value
					.split(',')
					.map((email) => email.trim())
					.filter(Boolean)
			)
		])
		.pipe(z.array(z.email()).max(10))
});

const bioSchema = z.object({
	cid: cidSchema,
	bio: z.string().trim().max(MAX_BIO_LENGTH)
});

// The first manual edit to a position starts from what VATUSA currently shows.
// Manual-only positions don't need this, since they never come from VATUSA.
async function seedFromVatusa(db: Database, position: string) {
	if (isManualOnlyPosition(position)) return;

	const existing = await db.query.staffAssignmentsTable.findFirst({
		where: eq(staffAssignmentsTable.position, position)
	});
	if (existing) return;

	const holders = getVatusaHolders(await getRoster(db), position);
	if (holders.length) {
		await db.insert(staffAssignmentsTable).values(holders.map((cid) => ({ position, cid })));
	}
}

async function parseForm<T extends z.ZodType>(request: Request, schema: T) {
	return schema.safeParse(Object.fromEntries(await request.formData()));
}

export const actions = {
	add: async ({ request, locals }) => {
		if (!isAdmin(locals.roles)) return fail(403, { message: 'Unauthorized' });

		const parsed = await parseForm(request, assignmentSchema);
		if (!parsed.success) return fail(400, { message: 'Invalid staff assignment' });
		const { position, cid } = parsed.data;

		await seedFromVatusa(locals.db, position);
		await locals.db.insert(staffAssignmentsTable).values({ position, cid }).onConflictDoNothing();

		logger.info(`User ${locals.user?.id} assigned ${cid} to staff position ${position}`);
	},

	remove: async ({ request, locals }) => {
		if (!isAdmin(locals.roles)) return fail(403, { message: 'Unauthorized' });

		const parsed = await parseForm(request, assignmentSchema);
		if (!parsed.success) return fail(400, { message: 'Invalid staff assignment' });
		const { position, cid } = parsed.data;

		await seedFromVatusa(locals.db, position);
		await locals.db
			.delete(staffAssignmentsTable)
			.where(and(eq(staffAssignmentsTable.position, position), eq(staffAssignmentsTable.cid, cid)));

		logger.info(`User ${locals.user?.id} removed ${cid} from staff position ${position}`);
	},

	reset: async ({ request, locals }) => {
		if (!isAdmin(locals.roles)) return fail(403, { message: 'Unauthorized' });

		const parsed = await parseForm(request, positionSchema);
		if (!parsed.success) return fail(400, { message: 'Invalid staff position' });
		const { position } = parsed.data;

		await locals.db
			.delete(staffAssignmentsTable)
			.where(eq(staffAssignmentsTable.position, position));

		logger.info(`User ${locals.user?.id} reset staff position ${position} to VATUSA roles`);
	},

	addTeamMember: async ({ request, locals }) => {
		if (!isAdmin(locals.roles)) return fail(403, { message: 'Unauthorized' });

		const parsed = await parseForm(request, teamMemberSchema);
		if (!parsed.success) return fail(400, { message: 'Invalid team member' });
		const { team, cid } = parsed.data;

		await locals.db
			.insert(staffTeamMembersTable)
			.values({ team, cid, excluded: false })
			.onConflictDoUpdate({
				target: [staffTeamMembersTable.team, staffTeamMembersTable.cid],
				set: { excluded: false }
			});

		logger.info(`User ${locals.user?.id} added ${cid} to staff team ${team}`);
	},

	removeTeamMember: async ({ request, locals }) => {
		if (!isAdmin(locals.roles)) return fail(403, { message: 'Unauthorized' });

		const parsed = await parseForm(request, teamMemberSchema);
		if (!parsed.success) return fail(400, { message: 'Invalid team member' });
		const { team, cid } = parsed.data;

		// Kept as an exclusion so VATUSA role holders stay off the team too
		await locals.db
			.insert(staffTeamMembersTable)
			.values({ team, cid, excluded: true })
			.onConflictDoUpdate({
				target: [staffTeamMembersTable.team, staffTeamMembersTable.cid],
				set: { excluded: true }
			});

		logger.info(`User ${locals.user?.id} removed ${cid} from staff team ${team}`);
	},

	saveBio: async ({ request, locals }) => {
		if (!isAdmin(locals.roles)) return fail(403, { message: 'Unauthorized' });

		const parsed = await parseForm(request, bioSchema);
		if (!parsed.success) {
			return fail(400, { message: `Bios must be ${MAX_BIO_LENGTH} characters or fewer` });
		}
		const { cid, bio } = parsed.data;

		if (bio) {
			await locals.db
				.insert(staffBiosTable)
				.values({ cid, bio })
				.onConflictDoUpdate({ target: staffBiosTable.cid, set: { bio } });
		} else {
			await locals.db.delete(staffBiosTable).where(eq(staffBiosTable.cid, cid));
		}

		logger.info(`User ${locals.user?.id} updated the staff bio for ${cid}`);
	},

	saveEmails: async ({ request, locals }) => {
		if (!isAdmin(locals.roles)) return fail(403, { message: 'Unauthorized' });

		const parsed = await parseForm(request, emailsSchema);
		if (!parsed.success) {
			return fail(400, { message: 'Enter up to 10 valid email addresses, separated by commas' });
		}
		const { key, emails } = parsed.data;

		if (emails.length) {
			await locals.db
				.insert(staffEmailsTable)
				.values({ key, emails })
				.onConflictDoUpdate({ target: staffEmailsTable.key, set: { emails } });
		} else {
			await locals.db.delete(staffEmailsTable).where(eq(staffEmailsTable.key, key));
		}

		logger.info(`User ${locals.user?.id} updated the staff emails for ${key}`);
	}
};

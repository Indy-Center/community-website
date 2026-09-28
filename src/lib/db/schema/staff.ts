import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// Manual staff assignments. When a position has any rows here, they replace the
// holders derived from VATUSA facility roles for that position.
export const staffAssignmentsTable = sqliteTable(
	'staff_assignments',
	{
		position: text('position').notNull(),
		cid: text('cid').notNull()
	},
	(table) => [primaryKey({ columns: [table.position, table.cid] })]
);

// Manual changes to a team's member list, on top of its VATUSA role holders.
// excluded = false adds the controller to the team, true removes them from it.
export const staffTeamMembersTable = sqliteTable(
	'staff_team_members',
	{
		team: text('team').notNull(),
		cid: text('cid').notNull(),
		excluded: integer('excluded', { mode: 'boolean' }).notNull().default(false)
	},
	(table) => [primaryKey({ columns: [table.team, table.cid] })]
);

// Bios shown for controllers on the staff page
export const staffBiosTable = sqliteTable('staff_bios', {
	cid: text('cid').primaryKey(),
	bio: text('bio').notNull()
});

// Contact emails for a staff position or team card, keyed by position or team key
export const staffEmailsTable = sqliteTable('staff_emails', {
	key: text('key').primaryKey(),
	emails: text('emails', { mode: 'json' }).$type<string[]>().notNull()
});

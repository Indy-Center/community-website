import { feedbackEventsTable } from '$lib/db/schema/feedback';
import type { FeedbackEventType } from '$lib/utils/feedbackReview';
import { userRolesTable } from '$lib/db/schema/roles';
import { usersTable, type User } from '$lib/db/schema/users';
import type { Database } from '$lib/server/db';
import { customPreferredName } from '$lib/members';
import { Role } from '$lib/utils/permissions';
import { eq, inArray } from 'drizzle-orm';

export type FeedbackEventInput = {
	/** Set when the caller needs to find the entry again; a new ID otherwise. */
	id?: string;
	feedbackId: string;
	userId: string;
	type: FeedbackEventType;
	value?: string | null;
	body?: string | null;
};

/**
 * The statement that adds an entry to a feedback item's review log. Not awaited here, so callers
 * can run it in a `db.batch` with the change it records.
 */
export function feedbackEventInsert(db: Database, event: FeedbackEventInput) {
	return db.insert(feedbackEventsTable).values({
		id: event.id ?? crypto.randomUUID(),
		feedbackId: event.feedbackId,
		userId: event.userId,
		type: event.type,
		value: event.value ?? null,
		body: event.body?.trim() || null
	});
}

// Everyone who can work feedback: admins and feedback reviewers, sorted by name
export async function getFeedbackReviewers(db: Database) {
	const rows = await db
		.selectDistinct({
			id: usersTable.id,
			cid: usersTable.cid,
			firstName: usersTable.firstName,
			lastName: usersTable.lastName,
			preferredName: usersTable.preferredName
		})
		.from(usersTable)
		.innerJoin(userRolesTable, eq(userRolesTable.userId, usersTable.id))
		.where(inArray(userRolesTable.role, [Role.ADMIN, Role.FEEDBACK_REVIEWER]));

	return rows
		.map((user) => ({
			id: user.id,
			cid: user.cid,
			name: user.preferredName || `${user.firstName} ${user.lastName}`
		}))
		.sort((a, b) => a.name.localeCompare(b.name));
}

/** The people a feedback alert names, fetched in one query and keyed by user ID. */
export async function fetchAlertPeople(db: Database, ids: (string | null | undefined)[]) {
	const wanted = [...new Set(ids.filter((id): id is string => !!id))];
	if (wanted.length === 0) return new Map<string, User>();

	const rows = await db.select().from(usersTable).where(inArray(usersTable.id, wanted));
	return new Map(rows.map((user) => [user.id, user]));
}

/**
 * How a pilot is named on published feedback: their preferred name, or first name and last
 * initial ("Tom M.") if they haven't set a custom one. This is only the default; staff can
 * change it before publishing.
 */
export function pilotDisplayName(
	user: Pick<User, 'firstName' | 'lastName' | 'preferredName'> | null | undefined
) {
	if (!user) return null;

	const firstName = user.firstName?.trim();
	const lastName = user.lastName?.trim();
	const shortName = firstName && (lastName ? `${firstName} ${lastName.charAt(0)}.` : firstName);

	return customPreferredName(user.preferredName) ?? (shortName || null);
}

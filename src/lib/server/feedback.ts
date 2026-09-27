import { feedbackEventsTable } from '$lib/db/schema/feedback';
import type { FeedbackEventType } from '$lib/utils/feedbackReview';
import { userRolesTable } from '$lib/db/schema/roles';
import { usersTable, type User } from '$lib/db/schema/users';
import type { Database } from '$lib/server/db';
import { Role } from '$lib/utils/permissions';
import { eq, inArray } from 'drizzle-orm';

// Adds an entry to a feedback item's review log
export async function logFeedbackEvent(
	db: Database,
	event: {
		feedbackId: string;
		userId: string;
		type: FeedbackEventType;
		value?: string | null;
		body?: string | null;
	}
) {
	await db.insert(feedbackEventsTable).values({
		id: crypto.randomUUID(),
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

	// Settings pre-fills the preferred name with the full name, so a preferred name that
	// just matches it isn't a real choice and would expose the full last name
	const normalize = (name: string) => name.replace(/\s+/g, ' ').trim().toLowerCase();
	const preferredName = user.preferredName?.trim();
	const hasCustomPreferredName =
		!!preferredName && normalize(preferredName) !== normalize(`${firstName} ${lastName}`);

	return (hasCustomPreferredName ? preferredName : shortName) || null;
}

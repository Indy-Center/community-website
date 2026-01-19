import { isAdmin } from '$lib/utils/permissions';
import { redirect } from '@sveltejs/kit';
import { usersTable } from '$lib/db/schema/users';
import { eventsTable, eventPositionsTable } from '$lib/db/schema/events';
import { feedbackTable } from '$lib/db/schema/feedback';
import { count, eq, sql } from 'drizzle-orm';

export const load = async ({ locals }) => {
	if (!isAdmin(locals.roles)) {
		return redirect(302, '/');
	}

	// Get user stats
	const totalUsers = await locals.db.select({ count: count() }).from(usersTable);
	const controllerUsers = await locals.db
		.select({ count: count() })
		.from(usersTable)
		.where(eq(usersTable.membership, 'controller'));

	// Get event stats
	const totalEvents = await locals.db.select({ count: count() }).from(eventsTable);
	const publishedEvents = await locals.db
		.select({ count: count() })
		.from(eventsTable)
		.where(eq(eventsTable.isPublished, true));

	// Get position stats
	const totalPositions = await locals.db.select({ count: count() }).from(eventPositionsTable);
	const assignedPositions = await locals.db
		.select({ count: count() })
		.from(eventPositionsTable)
		.where(sql`${eventPositionsTable.userId} IS NOT NULL`);

	// Get feedback stats
	const totalFeedback = await locals.db.select({ count: count() }).from(feedbackTable);
	const pendingFeedback = await locals.db
		.select({ count: count() })
		.from(feedbackTable)
		.where(eq(feedbackTable.status, 'pending'));

	return {
		user: locals.user,
		roles: locals.roles,
		stats: {
			users: {
				total: totalUsers[0]?.count || 0,
				controllers: controllerUsers[0]?.count || 0
			},
			events: {
				total: totalEvents[0]?.count || 0,
				published: publishedEvents[0]?.count || 0
			},
			positions: {
				total: totalPositions[0]?.count || 0,
				assigned: assignedPositions[0]?.count || 0
			},
			feedback: {
				total: totalFeedback[0]?.count || 0,
				pending: pendingFeedback[0]?.count || 0
			}
		}
	};
};

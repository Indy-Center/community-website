import { eventsTable } from '$lib/db/schema/events';
import type { DiscordStep } from '$lib/profile/linkedAccounts';
import { socialSteps } from '$lib/server/socials';
import { fetchMetars } from '$lib/server/vatsim/vatsimDataClient';
import { fetchControllers } from '$lib/server/vatsim/vnasDataClient.js';
import { asc, and, eq, gt, inArray } from 'drizzle-orm';

export const load = async ({ locals, platform }) => {
	const metars = await fetchMetars();

	const controllers = await fetchControllers();

	const events = await locals.db.query.eventsTable.findMany({
		orderBy: asc(eventsTable.startTime),
		where: and(
			gt(eventsTable.endTime, new Date()),
			inArray(eventsTable.type, ['community', 'home', 'group_flight']),
			eq(eventsTable.isPublished, true)
		),
		limit: 4
	});

	// The Discord button's state, streamed so asking larry doesn't hold up the page
	const discord: Promise<DiscordStep> = locals.user
		? socialSteps(platform?.env.LARRY, locals.user).then((steps) => steps.discord)
		: Promise.resolve('sign-in');

	return {
		events,
		metars,
		controllers,
		discord
	};
};

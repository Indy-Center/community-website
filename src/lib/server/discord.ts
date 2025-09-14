import type { Feedback } from '$lib/db/schema/feedback';
import { env } from '$env/dynamic/private';
import { usersTable } from '$lib/db/schema/users';
import { eq } from 'drizzle-orm';
import type { Database } from '$lib/server/db';

export async function notifyDiscordOfFeedback(db: Database, feedback: Feedback) {
	const submitter = await db.query.usersTable.findFirst({
		where: eq(usersTable.id, feedback.submitterId)
	});
	const controller = await db.query.usersTable.findFirst({
		where: eq(usersTable.id, feedback.controllerId)
	});

	const getDisplayName = (user: typeof submitter) => {
		if (!user) return 'Unknown User';
		const name = user.preferredName || `${user.firstName} ${user.lastName}`;
		return `${name} (${user.cid})`;
	};

	const embed = {
		title: '🎯 New Controller Feedback',
		description: feedback.feedback,
		color: 0x5865f2,
		fields: [
			{
				name: '👤 Controller',
				value: getDisplayName(controller),
				inline: true
			},
			{
				name: '⭐ Rating',
				value: feedback.rating.toUpperCase(),
				inline: true
			},
			{
				name: '📝 Submitted by',
				value: getDisplayName(submitter),
				inline: true
			}
		],
		footer: {
			text: `Feedback ID: ${feedback.id}`
		},
		timestamp: feedback.createdAt!.toISOString()
	};

	await fetch(env.DISCORD_WEBHOOK_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			username: 'Controller Feedback Bot',
			embeds: [embed]
		})
	});
}

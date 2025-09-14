import type { Feedback } from '$lib/db/schema/feedback';
import { env } from '$env/dynamic/private';
import { usersTable, type User } from '$lib/db/schema/users';
import { eq } from 'drizzle-orm';
import type { Database } from '$lib/server/db';

function getDisplayName(user: User) {
	if (!user) return 'Unknown User';
	const name = user.preferredName || `${user.firstName} ${user.lastName}`;
	return `${name} (${user.cid})`;
}

export async function notifyDiscordOfFeedbackStatusChange(
	db: Database,
	feedback: Feedback,
	adminUser: User
) {
	const submitter = await db.query.usersTable.findFirst({
		where: eq(usersTable.id, feedback.submitterId)
	});
	const controller = await db.query.usersTable.findFirst({
		where: eq(usersTable.id, feedback.controllerId)
	});
	const admin = await db.query.usersTable.findFirst({
		where: eq(usersTable.id, adminUser.id)
	});

	if (submitter && controller && admin) {
		const embed = {
			title: '🎯 Feedback Status Changed',
			description: feedback.feedback,
			color: feedback.status === 'approved' ? 0x5865f2 : 0xed4245,
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
					name: '👤 Reviewed by',
					value: getDisplayName(admin),
					inline: true
				},
				{
					name: '🔄 Review Status',
					value: feedback.status.toUpperCase(),
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
}

export async function notifyDiscordOfFeedback(db: Database, feedback: Feedback) {
	const submitter = await db.query.usersTable.findFirst({
		where: eq(usersTable.id, feedback.submitterId)
	});
	const controller = await db.query.usersTable.findFirst({
		where: eq(usersTable.id, feedback.controllerId)
	});

	if (submitter && controller) {
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
}

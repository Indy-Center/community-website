import type { Feedback } from '$lib/db/schema/feedback';
import { env } from '$env/dynamic/private';
import { usersTable, type User } from '$lib/db/schema/users';
import { eq } from 'drizzle-orm';
import type { Database } from '$lib/server/db';

export enum DiscordChannel {
	TECH_TEAM_ALERTS,
	SENIOR_STAFF_ALERTS
}

const DISCORD_CHANNELS = {
	[DiscordChannel.TECH_TEAM_ALERTS]: env.DISCORD_WEBHOOK_TECH_TEAM_ALERTS,
	[DiscordChannel.SENIOR_STAFF_ALERTS]: env.DISCORD_WEBHOOK_SENIOR_STAFF_ALERTS
};

export type DiscordEmbed = {
	title: string | null;
	description: string | null;
	color: number | null;
	fields: {
		name: string | null;
		value: string | null;
		inline: boolean;
	}[];
	footer: {
		text: string | null;
	};
	timestamp: string;
};

function getDisplayName(user: User) {
	if (!user) return 'Unknown User';
	const name = user.preferredName || `${user.firstName} ${user.lastName}`;
	return `${name} (${user.cid})`;
}

export async function sendDiscordEmbed(channel: DiscordChannel, embed: DiscordEmbed) {
	const webhookUrl = DISCORD_CHANNELS[channel];

	await fetch(webhookUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			embeds: [embed]
		})
	});
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

		await sendDiscordEmbed(DiscordChannel.SENIOR_STAFF_ALERTS, embed);
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

		await sendDiscordEmbed(DiscordChannel.SENIOR_STAFF_ALERTS, embed);
	}
}

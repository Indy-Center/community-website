import type { Feedback, FeedbackStatus } from '$lib/db/schema/feedback';
import { env } from '$env/dynamic/private';
import { usersTable, type User } from '$lib/db/schema/users';
import { eq } from 'drizzle-orm';
import type { Database } from '$lib/server/db';
import { logger } from './logger';
import { ratingLabel } from '$lib/utils/feedbackRatings';
import { statusLabel } from '$lib/utils/feedbackReview';
import { LarryChannel, type LarryBinding, type LarryMessage } from './larry';

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
	if (!webhookUrl) {
		logger.warn(`No webhook configured for Discord channel ${DiscordChannel[channel]}`);
		return;
	}

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

/**
 * Sends through Larry (the indy-larry Worker) instead of a webhook. Never throws, so a Discord
 * problem can't fail the action that triggered it. Returns whether the message went out.
 */
async function sendViaLarry(
	larry: LarryBinding | undefined,
	message: LarryMessage,
	mode: 'send' | 'enqueue'
) {
	if (!larry) {
		logger.warn(`LARRY binding is not set, skipping message to ${message.channel}`);
		return false;
	}

	try {
		await larry[mode](message);
		return true;
	} catch (error) {
		logger.error(`Larry message to ${message.channel} failed`, error);
		return false;
	}
}

const STATUS_COLORS: Partial<Record<FeedbackStatus, number>> = {
	approved: 0x5865f2,
	follow_up: 0xf1c40f,
	rejected: 0xed4245
};

export async function notifyDiscordOfFeedbackStatusChange(
	larry: LarryBinding | undefined,
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

	const assignee = feedback.assigneeId
		? await db.query.usersTable.findFirst({
				where: eq(usersTable.id, feedback.assigneeId)
			})
		: undefined;

	if (submitter && controller && admin) {
		const fields = [
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
				value: statusLabel(feedback.status).toUpperCase(),
				inline: true
			}
		];

		if (feedback.status === 'follow_up') {
			fields.push({
				name: '📌 Assigned to',
				value: assignee ? getDisplayName(assignee) : 'Unassigned',
				inline: true
			});
		}

		const embed = {
			title: '🎯 Feedback Status Changed',
			description: feedback.feedback ?? undefined,
			color: STATUS_COLORS[feedback.status] ?? 0x5865f2,
			fields,
			footer: {
				text: `Feedback ID: ${feedback.id}`
			},
			timestamp: feedback.createdAt!.toISOString()
		};

		await sendViaLarry(
			larry,
			{ channel: LarryChannel.SENIOR_STAFF_ALERTS, embeds: [embed] },
			'enqueue'
		);
	}
}

export async function notifyDiscordOfFeedback(
	larry: LarryBinding | undefined,
	db: Database,
	feedback: Feedback
) {
	const submitter = await db.query.usersTable.findFirst({
		where: eq(usersTable.id, feedback.submitterId)
	});
	const controller = await db.query.usersTable.findFirst({
		where: eq(usersTable.id, feedback.controllerId)
	});

	if (submitter && controller) {
		const embed = {
			title: '🎯 New Controller Feedback',
			description: feedback.feedback ?? undefined,
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

		await sendViaLarry(
			larry,
			{ channel: LarryChannel.SENIOR_STAFF_ALERTS, embeds: [embed] },
			'enqueue'
		);
	}
}

// Discord caps embed field values at 1024 characters
function fieldValue(value: string) {
	return value.length > 1024 ? `${value.slice(0, 1023)}…` : value;
}

/**
 * Posts identified published feedback to the feedback channel, using the values staff chose
 * to publish rather than the original submission. De-identified feedback is never posted.
 * Like the old website's post, it never includes CIDs, the reviewer, or the feedback ID.
 *
 * Never throws, so a Discord problem can't fail publishing. Returns whether the post went out.
 */
export async function announcePublishedFeedback(
	larry: LarryBinding | undefined,
	db: Database,
	feedback: Feedback
) {
	if (feedback.publishMode !== 'identified') return false;

	try {
		const controller = await db.query.usersTable.findFirst({
			where: eq(usersTable.id, feedback.controllerId)
		});

		if (!controller) {
			logger.warn(`Controller ${feedback.controllerId} not found, skipping feedback announcement`);
			return false;
		}

		// Matches the old website's post: "Braden Kearney (BK)"
		const name = controller.preferredName || `${controller.firstName} ${controller.lastName}`;
		const controllerName = controller.operatingInitials
			? `${name} (${controller.operatingInitials})`
			: name;

		const fields = [
			{ name: 'Controller', value: controllerName, inline: true },
			{ name: 'Position', value: feedback.publishedPosition || feedback.position, inline: true },
			{
				name: 'Rating',
				value: ratingLabel(feedback.publishedRating || feedback.rating),
				inline: true
			}
		];

		const pilot = [feedback.publishedPilotName?.trim(), feedback.publishedCallsign?.trim()]
			.filter(Boolean)
			.join(' · ');
		if (pilot) {
			fields.push({ name: 'Pilot', value: fieldValue(pilot), inline: false });
		}

		const comments = feedback.publishedFeedback?.trim();
		if (comments) {
			fields.push({ name: 'Comments', value: fieldValue(comments), inline: false });
		}

		return await sendViaLarry(
			larry,
			{
				channel: LarryChannel.FEEDBACK,
				content: 'New feedback received!',
				embeds: [{ color: 0x2ecc71, fields }]
			},
			'send'
		);
	} catch (error) {
		logger.error('Feedback announcement failed', error);
		return false;
	}
}

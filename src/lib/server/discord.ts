import type { Feedback, FeedbackStatus } from '$lib/db/schema/feedback';
import { env } from '$env/dynamic/private';
import type { User } from '$lib/db/schema/users';
import { logger } from './logger';
import { ratingLabel } from '$lib/utils/feedbackRatings';
import { statusLabel } from '$lib/utils/feedbackReview';
import { LarryChannel, type LarryBinding, type LarryMessage } from './larry';

export enum DiscordChannel {
	TECH_TEAM_ALERTS,
	SENIOR_STAFF_ALERTS
}

// Read per call: the scheduled handler only sets env after this module loads
const DISCORD_CHANNELS = {
	[DiscordChannel.TECH_TEAM_ALERTS]: () => env.DISCORD_WEBHOOK_TECH_TEAM_ALERTS,
	[DiscordChannel.SENIOR_STAFF_ALERTS]: () => env.DISCORD_WEBHOOK_SENIOR_STAFF_ALERTS
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

function getDisplayName(user: Pick<User, 'cid' | 'firstName' | 'lastName' | 'preferredName'>) {
	const name = user.preferredName || `${user.firstName} ${user.lastName}`;
	return `${name} (${user.cid})`;
}

export async function sendDiscordEmbed(channel: DiscordChannel, embed: DiscordEmbed) {
	const webhookUrl = DISCORD_CHANNELS[channel]();
	if (!webhookUrl) {
		throw new Error(`No Discord webhook is set for ${DiscordChannel[channel]}`);
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
 * Queues a message with Larry, which retries rate limits and Discord outages itself. Never throws,
 * so a Discord problem can't fail the action that triggered it. Returns whether Larry took the
 * message: false when the binding is missing or Larry refused it, e.g. for a channel that isn't
 * in its SEND_CHANNELS.
 */
export async function enqueueWithLarry(larry: LarryBinding | undefined, message: LarryMessage) {
	if (!larry) {
		logger.warn(`LARRY binding is not set, skipping message to ${message.channel}`);
		return false;
	}

	try {
		await larry.enqueue(message);
		return true;
	} catch (error) {
		logger.error(`Larry wouldn't queue the message to ${message.channel}`, error);
		return false;
	}
}

/** The people a feedback alert names, as fetched by the caller. */
type AlertPerson = Pick<User, 'cid' | 'firstName' | 'lastName' | 'preferredName'>;

const STATUS_COLORS: Partial<Record<FeedbackStatus, number>> = {
	approved: 0x5865f2,
	follow_up: 0xf1c40f,
	rejected: 0xed4245
};

/** Senior staff's alert for new feedback. */
export function newFeedbackAlert(
	feedback: Feedback,
	people: { submitter: AlertPerson; controller: AlertPerson }
): LarryMessage {
	return {
		channel: LarryChannel.SENIOR_STAFF_ALERTS,
		embeds: [
			{
				title: '🎯 New Controller Feedback',
				description: feedback.feedback ?? undefined,
				color: 0x5865f2,
				fields: [
					{ name: '👤 Controller', value: getDisplayName(people.controller), inline: true },
					{ name: '⭐ Rating', value: ratingLabel(feedback.rating).toUpperCase(), inline: true },
					{ name: '📝 Submitted by', value: getDisplayName(people.submitter), inline: true }
				],
				footer: { text: `Feedback ID: ${feedback.id}` },
				timestamp: feedback.createdAt?.toISOString()
			}
		]
	};
}

/** Senior staff's alert that a reviewer moved feedback to a new status. */
export function feedbackStatusAlert(
	feedback: Feedback,
	people: { controller: AlertPerson; reviewer: AlertPerson; assignee?: AlertPerson }
): LarryMessage {
	const fields = [
		{ name: '👤 Controller', value: getDisplayName(people.controller), inline: true },
		{ name: '⭐ Rating', value: ratingLabel(feedback.rating).toUpperCase(), inline: true },
		{ name: '👤 Reviewed by', value: getDisplayName(people.reviewer), inline: true },
		{ name: '🔄 Review Status', value: statusLabel(feedback.status).toUpperCase(), inline: true }
	];

	if (feedback.status === 'follow_up') {
		fields.push({
			name: '📌 Assigned to',
			value: people.assignee ? getDisplayName(people.assignee) : 'Unassigned',
			inline: true
		});
	}

	return {
		channel: LarryChannel.SENIOR_STAFF_ALERTS,
		embeds: [
			{
				title: '🎯 Feedback Status Changed',
				description: feedback.feedback ?? undefined,
				color: STATUS_COLORS[feedback.status] ?? 0x5865f2,
				fields,
				footer: { text: `Feedback ID: ${feedback.id}` },
				timestamp: feedback.createdAt?.toISOString()
			}
		]
	};
}

// Discord caps embed field values at 1024 characters
function fieldValue(value: string) {
	return value.length > 1024 ? `${value.slice(0, 1023)}…` : value;
}

/**
 * The public post for feedback published as identified, using the values staff chose to publish
 * rather than the original submission. De-identified feedback is never posted. Like the old
 * website's post, it never includes CIDs, the reviewer, or the feedback ID.
 */
export function publishedFeedbackPost(
	feedback: Feedback,
	controller: Pick<User, 'firstName' | 'lastName' | 'preferredName' | 'operatingInitials'>
): LarryMessage {
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

	return {
		channel: LarryChannel.FEEDBACK,
		content: 'New feedback received!',
		embeds: [{ color: 0x2ecc71, fields }]
	};
}

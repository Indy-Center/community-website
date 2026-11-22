// New feedback -> Accept | Follow Up | Reject. Follow ups are worked by an assignee, then
// accepted or rejected. "approved" is shown as "Accepted".
export const FEEDBACK_STATUSES = ['pending', 'follow_up', 'approved', 'rejected'] as const;
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

// Identified feedback is posted with the pilot's details to Discord and shown on the controller's
// private profile.
// De-identified feedback is only shown on the controller's private profile, without them,
// and is never posted to Discord.
export const PUBLISH_MODES = ['identified', 'deidentified'] as const;
export type PublishMode = (typeof PUBLISH_MODES)[number];

// Review log entries: status changes, assignments, comments, actions taken, and publishing
export const FEEDBACK_EVENT_TYPES = [
	'status',
	'assigned',
	'comment',
	'action',
	'published'
] as const;
export type FeedbackEventType = (typeof FEEDBACK_EVENT_TYPES)[number];

export const STATUS_LABELS: Record<FeedbackStatus, string> = {
	pending: 'New',
	follow_up: 'Follow Up',
	approved: 'Accepted',
	rejected: 'Rejected'
};

export const PUBLISH_MODE_LABELS: Record<PublishMode, string> = {
	identified: 'Identified',
	deidentified: 'De-identified'
};

export function statusLabel(status: string) {
	return STATUS_LABELS[status as FeedbackStatus] ?? status;
}

// How many items have each status, with a zero for any that has none
export function countByStatus(rows: { status: string; count: number }[]) {
	const counts = Object.fromEntries(FEEDBACK_STATUSES.map((s) => [s, 0])) as Record<
		FeedbackStatus,
		number
	>;
	for (const row of rows) {
		if (row.status in counts) counts[row.status as FeedbackStatus] = row.count;
	}
	return counts;
}

// Badge colours for review screens. The badge's text always says the status; colour only helps.
export const STATUS_BADGES: Record<FeedbackStatus, 'sky' | 'yellow' | 'green' | 'red'> = {
	pending: 'sky',
	follow_up: 'yellow',
	approved: 'green',
	rejected: 'red'
};

export const RATING_BADGES: Record<string, 'green' | 'blue' | 'sky' | 'yellow' | 'red'> = {
	excellent: 'green',
	very_good: 'blue',
	good: 'sky',
	fair: 'yellow',
	poor: 'red'
};

type Named = { firstName: string; lastName: string; preferredName: string | null } | null;

// How staff screens name a member: their preferred name, or their full name
export function memberName(user: Named | undefined) {
	if (!user) return 'Unknown member';
	return user.preferredName || `${user.firstName} ${user.lastName}`;
}

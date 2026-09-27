// New feedback -> Accept | Follow Up | Reject. Follow ups are worked by an assignee, then
// accepted or rejected. "approved" is shown as "Accepted".
export const FEEDBACK_STATUSES = ['pending', 'follow_up', 'approved', 'rejected'] as const;
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

// Identified feedback is posted with the pilot's details to Discord and the public profile.
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

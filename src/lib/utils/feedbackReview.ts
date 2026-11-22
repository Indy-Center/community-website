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

const ZULU = new Intl.DateTimeFormat('en-GB', {
	timeZone: 'UTC',
	day: 'numeric',
	month: 'short',
	year: 'numeric',
	hour: '2-digit',
	minute: '2-digit',
	hourCycle: 'h23'
});

// "21 Nov 2026, 0157Z": the same on the server and in the browser, whatever the member's zone
export function zuluDateTime(at: Date | string | number) {
	const parts = Object.fromEntries(ZULU.formatToParts(new Date(at)).map((p) => [p.type, p.value]));
	return `${parts.day} ${parts.month} ${parts.year}, ${parts.hour}${parts.minute}Z`;
}

export type ReviewStep = {
	label: string;
	state: 'done' | 'current' | 'upcoming';
	detail?: string | null;
	date?: string | null;
};

type LogEvent = {
	id: string;
	type: FeedbackEventType;
	value: string | null;
	body: string | null;
	createdAt: Date | null;
	user: Named;
};

// Entries saved together share a second; this keeps them in the order they happened
const EVENT_ORDER: Record<FeedbackEventType, number> = {
	status: 0,
	assigned: 1,
	published: 2,
	action: 3,
	comment: 4
};

function withBody(who: string, body: string | null) {
	return body ? `${who}: ${body}` : `By ${who}`;
}

/**
 * A feedback item's audit trail for `Steps`: when it came in, everything reviewers did, then what
 * happens next. `reviewerName` names an assignee from their user ID.
 */
export function reviewSteps(
	feedback: {
		status: FeedbackStatus;
		publishMode: PublishMode | null;
		createdAt: Date | null;
		submitter: Named;
		assignee: Named;
		events: LogEvent[];
	},
	reviewerName: (id: string) => string
): ReviewStep[] {
	const steps: ReviewStep[] = [
		{
			label: 'Submitted',
			state: 'done',
			detail: `By ${memberName(feedback.submitter)}`,
			date: feedback.createdAt ? zuluDateTime(feedback.createdAt) : null
		}
	];

	const events = [...feedback.events].sort(
		(a, b) =>
			(a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0) ||
			EVENT_ORDER[a.type] - EVENT_ORDER[b.type]
	);
	for (const event of events) {
		const who = memberName(event.user);
		const date = event.createdAt ? zuluDateTime(event.createdAt) : null;
		const step = { state: 'done' as const, date };
		switch (event.type) {
			case 'status':
				steps.push({
					...step,
					label: `Moved to ${statusLabel(event.value ?? '')}`,
					detail: withBody(who, event.body)
				});
				break;
			case 'assigned':
				steps.push({
					...step,
					label: event.value ? `Assigned to ${reviewerName(event.value)}` : 'Unassigned',
					detail: `By ${who}`
				});
				break;
			case 'published':
				steps.push({
					...step,
					label: `Published ${(PUBLISH_MODE_LABELS[event.value as PublishMode] ?? '').toLowerCase()}`,
					detail: withBody(who, event.body)
				});
				break;
			case 'action':
				steps.push({ ...step, label: 'Action taken', detail: withBody(who, event.body) });
				break;
			default:
				steps.push({ ...step, label: 'Comment', detail: withBody(who, event.body) });
		}
	}

	// What happens next
	if (feedback.status === 'pending') {
		steps.push({ label: 'Triage', state: 'current', detail: 'Accept, follow up or reject' });
	} else if (feedback.status === 'follow_up') {
		steps.push({
			label: 'Follow up',
			state: 'current',
			detail: feedback.assignee
				? `Worked by ${memberName(feedback.assignee)}`
				: 'Nobody has picked it up yet'
		});
		steps.push({ label: 'Accept or reject', state: 'upcoming' });
	} else if (feedback.status === 'approved' && !feedback.publishMode) {
		steps.push({
			label: 'Publish',
			state: 'upcoming',
			detail: 'Optional: identified or de-identified'
		});
	}

	return steps;
}

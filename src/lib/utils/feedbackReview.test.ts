import { describe, expect, it } from 'vitest';
import { reviewSteps, zuluDateTime } from './feedbackReview';

const riley = { firstName: 'Riley', lastName: 'Reviewer', preferredName: null };
const pat = { firstName: 'Pat', lastName: 'Pilot', preferredName: null };
const at = (iso: string) => new Date(iso);
const names = (id: string) => (id === 'user-riley' ? 'Riley Reviewer' : 'a former reviewer');

function item(overrides: Partial<Parameters<typeof reviewSteps>[0]> = {}) {
	return {
		status: 'pending' as const,
		publishMode: null,
		createdAt: at('2026-11-20T18:05:00Z'),
		submitter: pat,
		assignee: null,
		events: [],
		...overrides
	};
}

describe('zuluDateTime', () => {
	it('writes the day and Zulu time, whatever the zone', () => {
		expect(zuluDateTime('2026-11-21T01:57:00Z')).toBe('21 Nov 2026, 0157Z');
	});
});

describe('reviewSteps', () => {
	it('shows new feedback as submitted, waiting on triage', () => {
		expect(reviewSteps(item(), names)).toEqual([
			{ label: 'Submitted', state: 'done', detail: 'By Pat Pilot', date: '20 Nov 2026, 1805Z' },
			{ label: 'Triage', state: 'current', detail: 'Accept, follow up or reject' }
		]);
	});

	it('lists what reviewers did in order, with entries saved together kept in order', () => {
		const sameSecond = at('2026-11-21T02:00:00Z');
		const steps = reviewSteps(
			item({
				status: 'approved',
				publishMode: 'identified',
				events: [
					// Saved in one batch, and returned in either order
					{
						id: 'b',
						type: 'published',
						value: 'identified',
						body: null,
						createdAt: sameSecond,
						user: riley
					},
					{
						id: 'a',
						type: 'status',
						value: 'approved',
						body: 'Great work',
						createdAt: sameSecond,
						user: riley
					}
				]
			}),
			names
		);

		expect(steps.map((s) => [s.label, s.detail])).toEqual([
			['Submitted', 'By Pat Pilot'],
			['Moved to Accepted', 'Riley Reviewer: Great work'],
			['Published identified', 'By Riley Reviewer']
		]);
		// Published feedback has nothing left to do
		expect(steps.every((s) => s.state === 'done')).toBe(true);
	});

	it('shows who works a follow up, then what comes after', () => {
		const steps = reviewSteps(
			item({
				status: 'follow_up',
				assignee: riley,
				events: [
					{
						id: 'a',
						type: 'status',
						value: 'follow_up',
						body: null,
						createdAt: at('2026-11-21T02:00:00Z'),
						user: riley
					},
					{
						id: 'b',
						type: 'assigned',
						value: 'user-riley',
						body: null,
						createdAt: at('2026-11-21T02:00:00Z'),
						user: riley
					}
				]
			}),
			names
		);

		expect(steps.slice(-3)).toEqual([
			expect.objectContaining({ label: 'Assigned to Riley Reviewer', state: 'done' }),
			{ label: 'Follow up', state: 'current', detail: 'Worked by Riley Reviewer' },
			{ label: 'Accept or reject', state: 'upcoming' }
		]);
	});

	it('offers publishing as the next step for accepted feedback that is not published', () => {
		const steps = reviewSteps(item({ status: 'approved' }), names);
		expect(steps.at(-1)).toEqual({
			label: 'Publish',
			state: 'upcoming',
			detail: 'Optional: identified or de-identified'
		});
	});
});

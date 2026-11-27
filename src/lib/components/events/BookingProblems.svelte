<script lang="ts">
	import { enhance } from '$app/forms';
	import { Alert, Button, CopyButton } from '@indy-center/centerline-svelte';
	import type { EventBookingProblem } from '$lib/db/schema/events';

	type Props = {
		problems: Pick<
			EventBookingProblem,
			'id' | 'positionId' | 'callsign' | 'cid' | 'action' | 'message' | 'createdAt'
		>[];
		/** The form action that dismisses them, e.g. `/events/<id>?/dismissBookingProblems`. */
		dismissAction: string;
	};

	let { problems, dismissAction }: Props = $props();

	const DOING = { book: 'Booking', cancel: 'Cancelling', move: 'Moving' } as const;

	const line = (problem: Props['problems'][number]) =>
		`${DOING[problem.action]} ${problem.callsign ?? problem.positionId} for CID ${problem.cid}: ${problem.message}`;

	// What to paste to the tech team: every error, with when it happened
	const report = $derived(
		problems.map((problem) => `${problem.createdAt.toISOString()} ${line(problem)}`).join('\n')
	);
</script>

{#if problems.length > 0}
	<Alert level="danger" title="Some positions couldn't be updated on the booking calendar">
		<p>
			The roster is saved, but the booking system didn't take these changes. Contact the tech team
			and send them the errors below.
		</p>
		<ul class="my-2 list-disc pl-5">
			{#each problems as problem (problem.id)}
				<li>{line(problem)}</li>
			{/each}
		</ul>
		<div class="flex flex-wrap gap-2">
			<CopyButton text={report} label="errors" />
			<form method="POST" action={dismissAction} use:enhance>
				<Button type="submit" variant="secondary" size="sm">Dismiss</Button>
			</form>
		</div>
	</Alert>
{/if}

<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { DropdownMenu, DropdownMenuItem } from '@indy-center/centerline-svelte';

	// Follow up opens a menu to pick who works it. Posts to the feedback page.
	let {
		feedbackId,
		controllerName,
		reviewers,
		userId
	}: {
		feedbackId: string;
		controllerName: string;
		reviewers: { id: string; name: string }[];
		userId?: string;
	} = $props();

	let submitting = $state(false);

	// You first, then everyone else
	const others = $derived(reviewers.filter((r) => r.id !== userId));
	const isReviewer = $derived(reviewers.some((r) => r.id === userId));

	const submit: SubmitFunction = () => {
		submitting = true;
		return async ({ update }) => {
			submitting = false;
			await update({ reset: false });
		};
	};
</script>

<form method="POST" action="/admin/feedback/{feedbackId}?/followUp" use:enhance={submit}>
	<input type="hidden" name="note" value="" />
	<DropdownMenu
		label="Follow up on feedback for {controllerName}: choose who works it"
		text="Follow up"
		disabled={submitting}
	>
		{#if isReviewer}
			<DropdownMenuItem type="submit" name="assigneeId" value={userId}
				>Assign to me</DropdownMenuItem
			>
		{/if}
		{#each others as reviewer (reviewer.id)}
			<DropdownMenuItem type="submit" name="assigneeId" value={reviewer.id}>
				Assign to {reviewer.name}
			</DropdownMenuItem>
		{/each}
		<DropdownMenuItem type="submit" name="assigneeId" value="">Assign later</DropdownMenuItem>
	</DropdownMenu>
</form>

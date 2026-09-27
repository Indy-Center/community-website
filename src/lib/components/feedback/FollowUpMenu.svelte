<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import IconFlag from '~icons/mdi/flag';
	import IconChevronDown from '~icons/mdi/chevron-down';
	import IconAccount from '~icons/mdi/account';
	import IconAccountQuestion from '~icons/mdi/account-question';

	// Follow Up opens a menu to pick who works it. Posts to the feedback page.
	let {
		feedbackId,
		reviewers,
		userId
	}: {
		feedbackId: string;
		reviewers: { id: string; name: string }[];
		userId?: string;
	} = $props();

	let open = $state(false);
	let submitting = $state(false);
	let container: HTMLDivElement;

	// You first, then everyone else
	const others = $derived(reviewers.filter((r) => r.id !== userId));
	const isReviewer = $derived(reviewers.some((r) => r.id === userId));

	const submit: SubmitFunction = () => {
		open = false;
		submitting = true;
		return async ({ update }) => {
			submitting = false;
			await update({ reset: false });
		};
	};

	function closeOnOutside(event: MouseEvent) {
		if (open && !container.contains(event.target as Node)) open = false;
	}
</script>

<svelte:window onclick={closeOnOutside} onkeydown={(e) => e.key === 'Escape' && (open = false)} />

<div class="relative" bind:this={container}>
	<form method="POST" action="/admin/feedback/{feedbackId}?/followUp" use:enhance={submit}>
		<input type="hidden" name="note" value="" />
		<button
			type="button"
			disabled={submitting}
			onclick={() => (open = !open)}
			aria-haspopup="menu"
			aria-expanded={open}
			class="flex items-center gap-2 rounded-lg border border-yellow-600 bg-yellow-700 px-4 py-2 text-sm text-white hover:bg-yellow-600 disabled:opacity-60"
		>
			<IconFlag class="h-4 w-4" />
			Follow Up
			<IconChevronDown class="h-4 w-4 transition-transform {open ? 'rotate-180' : ''}" />
		</button>

		{#if open}
			<div
				role="menu"
				class="absolute top-full right-0 z-20 mt-1 max-h-80 w-64 overflow-y-auto rounded-lg border border-slate-600 bg-slate-800 shadow-xl"
			>
				<button
					type="submit"
					role="menuitem"
					name="assigneeId"
					value=""
					class="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-200 hover:bg-slate-700"
				>
					<IconAccountQuestion class="h-4 w-4 shrink-0 text-gray-400" />
					Assign later
				</button>
				{#if isReviewer}
					<button
						type="submit"
						role="menuitem"
						name="assigneeId"
						value={userId}
						class="flex w-full items-center gap-2 border-t border-slate-700 px-4 py-2.5 text-left text-sm text-gray-200 hover:bg-slate-700"
					>
						<IconAccount class="h-4 w-4 shrink-0 text-yellow-400" />
						Assign to me
					</button>
				{/if}
				{#each others as reviewer (reviewer.id)}
					<button
						type="submit"
						role="menuitem"
						name="assigneeId"
						value={reviewer.id}
						class="flex w-full items-center gap-2 border-t border-slate-700 px-4 py-2.5 text-left text-sm text-gray-200 hover:bg-slate-700"
					>
						<IconAccount class="h-4 w-4 shrink-0 text-gray-400" />
						{reviewer.name}
					</button>
				{/each}
			</div>
		{/if}
	</form>
</div>

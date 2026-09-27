<script lang="ts">
	import { FEEDBACK_STATUSES, PUBLISH_MODE_LABELS, STATUS_LABELS } from '$lib/utils/feedbackReview';
	import { ratingLabel } from '$lib/utils/feedbackRatings';
	import IconMessage from '~icons/mdi/message';
	import IconChevronRight from '~icons/mdi/chevron-right';
	import IconAccountArrowRight from '~icons/mdi/account-arrow-right';
	import IconBullhorn from '~icons/mdi/bullhorn';
	import { formatDistanceToNow } from 'date-fns';
	import AcceptActions from '$lib/components/feedback/AcceptActions.svelte';
	import FollowUpMenu from '$lib/components/feedback/FollowUpMenu.svelte';
	import IconClose from '~icons/mdi/close';
	import { enhance } from '$app/forms';

	let { data } = $props();

	const EMPTY_MESSAGES = {
		pending: 'No new feedback. Everything has been triaged.',
		follow_up: 'Nothing is waiting on a follow up.',
		approved: 'No accepted feedback yet.',
		rejected: 'No rejected feedback.'
	};

	function tabHref(status: string, mine = data.mine) {
		const params = new URLSearchParams({ status });
		if (mine) params.set('mine', '1');
		return `?${params}`;
	}

	function getRatingColor(rating: string) {
		switch (rating) {
			case 'excellent':
				return 'bg-green-600/20 text-green-300';
			case 'very_good':
				return 'bg-teal-600/20 text-teal-300';
			case 'good':
				return 'bg-blue-600/20 text-blue-300';
			case 'fair':
				return 'bg-yellow-600/20 text-yellow-300';
			case 'poor':
				return 'bg-red-600/20 text-red-300';
			default:
				return 'bg-gray-600/20 text-gray-300';
		}
	}

	type Named = { firstName: string; lastName: string; preferredName: string | null } | null;

	function getDisplayName(user: Named) {
		if (!user) return 'Unknown User';
		return user.preferredName || `${user.firstName} ${user.lastName}`;
	}
</script>

<svelte:head>
	<title>Feedback Management - Admin - Indy Center</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-wrap items-center justify-between gap-4">
		<div>
			<h2 class="text-2xl font-semibold text-white">Feedback Management</h2>
			<p class="mt-1 text-sm text-gray-400">
				Triage new feedback, work follow ups, and publish accepted feedback
			</p>
		</div>
		<a
			href={tabHref(data.status, !data.mine)}
			class="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors {data.mine
				? 'border-sky-500/50 bg-sky-600/20 text-sky-300'
				: 'border-slate-600 text-gray-300 hover:bg-slate-700/50'}"
		>
			<IconAccountArrowRight class="h-4 w-4" />
			Assigned to me
		</a>
	</div>

	<!-- Status tabs -->
	<div class="border-b border-slate-700/50">
		<nav class="-mb-px flex flex-wrap gap-x-6">
			{#each FEEDBACK_STATUSES as status}
				<a
					href={tabHref(status)}
					class="flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition-colors {data.status ===
					status
						? 'border-sky-400 text-sky-400'
						: 'border-transparent text-gray-400 hover:border-gray-300 hover:text-gray-300'}"
				>
					{STATUS_LABELS[status]}
					<span class="rounded-full bg-slate-700 px-2 py-0.5 text-xs text-gray-300">
						{data.counts[status]}
					</span>
				</a>
			{/each}
		</nav>
	</div>

	{#if data.feedback.length === 0}
		<div class="rounded-lg border border-slate-700/50 bg-slate-800/50 p-8 text-center">
			<IconMessage class="mx-auto mb-4 h-12 w-12 text-gray-400" />
			<p class="text-gray-400">
				{data.mine ? 'Nothing here is assigned to you.' : EMPTY_MESSAGES[data.status]}
			</p>
		</div>
	{:else}
		<div class="grid gap-3">
			{#each data.feedback as item (item.id)}
				<div
					class="flex flex-col gap-4 rounded-lg border border-slate-700/50 bg-slate-800/50 p-4 transition-colors hover:bg-slate-700/40 sm:flex-row sm:items-center"
				>
					<a
						href="/admin/feedback/{item.id}"
						class="group flex min-w-0 flex-1 items-center justify-between gap-4"
					>
						<div class="min-w-0">
							<div class="flex flex-wrap items-center gap-2">
								<span class="font-medium text-white">{getDisplayName(item.controller)}</span>
								<span class="font-mono text-xs text-gray-400">{item.position}</span>
								<span class="rounded px-2 py-0.5 text-xs {getRatingColor(item.rating)}">
									{ratingLabel(item.rating)}
								</span>
								{#if item.publishMode}
									<span
										class="flex items-center gap-1 rounded bg-emerald-600/20 px-2 py-0.5 text-xs text-emerald-300"
									>
										<IconBullhorn class="h-3 w-3" />
										{PUBLISH_MODE_LABELS[item.publishMode]}
									</span>
								{:else if item.status === 'approved'}
									<span class="rounded bg-slate-600/40 px-2 py-0.5 text-xs text-gray-300">
										Not published
									</span>
								{/if}
							</div>
							<div class="mt-1 text-xs text-gray-400">
								from {getDisplayName(item.submitter)}
								{#if item.callsign}<span class="font-mono">({item.callsign})</span>{/if}
								• {formatDistanceToNow(new Date(item.createdAt!))} ago
								{#if item.status === 'follow_up'}
									• <span class="text-yellow-300">
										{item.assignee ? `Assigned to ${getDisplayName(item.assignee)}` : 'Unassigned'}
									</span>
								{/if}
							</div>
							{#if item.feedback}
								<p class="mt-2 line-clamp-2 text-sm text-gray-300">{item.feedback}</p>
							{/if}
						</div>
						<IconChevronRight
							class="h-5 w-5 flex-shrink-0 text-gray-500 transition-colors group-hover:text-gray-300"
						/>
					</a>
					{#if item.status === 'pending'}
						<div
							class="flex shrink-0 flex-wrap items-center gap-2 border-t border-slate-700/50 pt-3 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-4"
						>
							<AcceptActions feedbackId={item.id} />
							<FollowUpMenu feedbackId={item.id} reviewers={data.reviewers} userId={data.userId} />
							<form method="POST" action="/admin/feedback/{item.id}?/reject" use:enhance>
								<input type="hidden" name="note" value="" />
								<button
									type="submit"
									class="flex items-center gap-2 rounded-lg border border-red-600 bg-red-700 px-4 py-2 text-sm text-white hover:bg-red-600"
								>
									<IconClose class="h-4 w-4" />
									Reject
								</button>
							</form>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

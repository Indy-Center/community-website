<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import IconCheck from '~icons/mdi/check';
	import IconClose from '~icons/mdi/close';
	import IconClock from '~icons/mdi/clock';
	import IconMessage from '~icons/mdi/message';
	import IconAccount from '~icons/mdi/account';
	import IconChevronDown from '~icons/mdi/chevron-down';
	import IconChevronRight from '~icons/mdi/chevron-right';
	import { formatDistanceToNow } from 'date-fns';

	let { data } = $props();

	const feedback = $derived.by(() => data.feedback);
	const pendingFeedback = $derived.by(() => feedback.filter((f) => f.status === 'pending'));
	const reviewedFeedback = $derived.by(() => feedback.filter((f) => f.status !== 'pending'));

	let expandedCards = $state(new Set<string>());

	function toggleExpanded(feedbackId: string) {
		const newExpanded = new Set(expandedCards);
		if (newExpanded.has(feedbackId)) {
			newExpanded.delete(feedbackId);
		} else {
			newExpanded.add(feedbackId);
		}
		expandedCards = newExpanded;
	}

	function getStatusColor(status: string) {
		switch (status) {
			case 'pending':
				return 'bg-yellow-600/20 text-yellow-300 border-yellow-500/30';
			case 'approved':
				return 'bg-green-600/20 text-green-300 border-green-500/30';
			case 'rejected':
				return 'bg-red-600/20 text-red-300 border-red-500/30';
			default:
				return 'bg-gray-600/20 text-gray-300 border-gray-500/30';
		}
	}

	function getRatingColor(rating: string) {
		switch (rating) {
			case 'excellent':
				return 'bg-green-600/20 text-green-300';
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

	function getDisplayName(user: any) {
		if (!user) return 'Unknown User';
		return user.preferredName || `${user.firstName} ${user.lastName}`;
	}
</script>

<svelte:head>
	<title>Feedback Management - Admin - Indy Center</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h2 class="text-2xl font-semibold text-white">Feedback Management</h2>
			<p class="mt-1 text-sm text-gray-400">Review and manage controller feedback submissions</p>
		</div>
		<div class="flex items-center space-x-4 text-sm text-gray-400">
			<div class="flex items-center space-x-2">
				<IconClock class="h-4 w-4" />
				<span>{pendingFeedback.length} pending</span>
			</div>
			<div class="flex items-center space-x-2">
				<IconMessage class="h-4 w-4" />
				<span>{feedback.length} total</span>
			</div>
		</div>
	</div>

	<!-- Pending Feedback Section -->
	{#if pendingFeedback.length > 0}
		<div class="space-y-4">
			<h3 class="text-lg font-semibold text-white">Pending Review</h3>

			{#each pendingFeedback as feedback}
				<div class="rounded-lg border border-slate-700/50 bg-slate-800/50 p-6">
					<div class="mb-4 flex items-start justify-between">
						<div class="flex items-center space-x-4">
							<IconAccount class="h-10 w-10 flex-shrink-0 text-gray-400" />
							<div>
								<div class="font-medium text-white">
									Controller: {getDisplayName(feedback.controller)}
								</div>
								<div class="text-sm text-gray-400">
									Submitted by: {getDisplayName(feedback.submitter)}
									{#if feedback.callsign}
										({feedback.callsign})
									{/if}
									{feedback.submitter.email}
								</div>
								<div class="mt-1 text-xs text-gray-500">
									{formatDistanceToNow(new Date(feedback.createdAt!))} ago
								</div>
							</div>
						</div>

						<div class="flex items-center space-x-2">
							<span
								class="rounded border px-2 py-1 font-mono text-xs {getStatusColor(feedback.status)}"
							>
								{feedback.status}
							</span>
							<span class="rounded px-2 py-1 text-xs {getRatingColor(feedback.rating)}">
								{feedback.rating}
							</span>
						</div>
					</div>

					<div class="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
						<div>
							<div class="text-sm text-gray-400">Position</div>
							<div class="text-white">{feedback.position}</div>
						</div>
						{#if feedback.callsign}
							<div>
								<div class="text-sm text-gray-400">Callsign</div>
								<div class="font-mono text-white">{feedback.callsign}</div>
							</div>
						{/if}
					</div>

					{#if feedback.feedback}
						<div class="mb-6">
							<div class="mb-2 text-sm text-gray-400">Feedback</div>
							<div
								class="rounded-lg border border-slate-600/50 bg-slate-700/50 p-4 text-sm text-white"
							>
								{feedback.feedback}
							</div>
						</div>
					{/if}

					<!-- Action Buttons -->
					<div class="flex items-center space-x-3">
						<form
							method="POST"
							action="?/approve"
							use:enhance={() => {
								return async ({ result }) => {
									if (result.type === 'success') {
										await invalidateAll();
									}
								};
							}}
						>
							<input type="hidden" name="feedbackId" value={feedback.id} />
							<button
								type="submit"
								class="flex cursor-pointer items-center space-x-2 rounded-lg border border-green-600 bg-green-700 px-4 py-2 text-sm text-white transition-all duration-200 hover:bg-green-600 focus:border-green-500 focus:ring-2 focus:ring-green-500 focus:outline-none"
							>
								<IconCheck class="h-4 w-4" />
								<span>Approve</span>
							</button>
						</form>

						<form
							method="POST"
							action="?/reject"
							use:enhance={() => {
								return async ({ result }) => {
									if (result.type === 'success') {
										await invalidateAll();
									}
								};
							}}
						>
							<input type="hidden" name="feedbackId" value={feedback.id} />
							<button
								type="submit"
								class="flex cursor-pointer items-center space-x-2 rounded-lg border border-red-600 bg-red-700 px-4 py-2 text-sm text-white transition-all duration-200 hover:bg-red-600 focus:border-red-500 focus:ring-2 focus:ring-red-500 focus:outline-none"
							>
								<IconClose class="h-4 w-4" />
								<span>Reject</span>
							</button>
						</form>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<div class="rounded-lg border border-slate-700/50 bg-slate-800/50 p-8 text-center">
			<IconClock class="mx-auto mb-4 h-12 w-12 text-gray-400" />
			<h3 class="mb-2 text-lg font-semibold text-white">No Pending Feedback</h3>
			<p class="text-gray-400">All feedback has been reviewed</p>
		</div>
	{/if}

	<!-- Reviewed Feedback Section -->
	{#if reviewedFeedback.length > 0}
		<div class="space-y-4">
			<h3 class="text-lg font-semibold text-white">Recently Reviewed</h3>

			<div class="grid gap-4">
				{#each reviewedFeedback.slice(0, 10) as feedback}
					{@const isExpanded = expandedCards.has(feedback.id)}
					<div
						class="rounded-lg border border-slate-700/50 bg-slate-800/30 transition-all duration-200"
					>
						<button
							onclick={() => toggleExpanded(feedback.id)}
							class="w-full cursor-pointer p-4 text-left transition-colors duration-200 hover:bg-slate-700/30"
						>
							<div class="flex items-center justify-between">
								<div class="flex items-center space-x-3">
									{#if isExpanded}
										<IconChevronDown class="h-4 w-4 flex-shrink-0 text-gray-400" />
									{:else}
										<IconChevronRight class="h-4 w-4 flex-shrink-0 text-gray-400" />
									{/if}
									<div>
										<div class="text-sm font-medium text-white">
											{getDisplayName(feedback.controller)}
										</div>
										<div class="text-xs text-gray-400">
											by {getDisplayName(feedback.submitter)} • {formatDistanceToNow(
												new Date(feedback.createdAt!)
											)} ago
										</div>
									</div>
								</div>
								<div class="flex items-center space-x-2">
									<span class="rounded px-2 py-1 text-xs {getRatingColor(feedback.rating)}">
										{feedback.rating}
									</span>
									<span
										class="rounded border px-2 py-1 font-mono text-xs {getStatusColor(
											feedback.status
										)}"
									>
										{feedback.status}
									</span>
								</div>
							</div>
						</button>

						{#if isExpanded}
							<div class="border-t border-slate-700/30 px-4 pb-4">
								<div class="pt-4">
									<div class="mb-4 flex items-start space-x-4">
										<IconAccount class="h-10 w-10 flex-shrink-0 text-gray-400" />
										<div>
											<div class="font-medium text-white">
												Controller: {getDisplayName(feedback.controller)}
											</div>
											<div class="text-sm text-gray-400">
												Submitted by: {getDisplayName(feedback.submitter)}
												{#if feedback.callsign}
													({feedback.callsign})
												{/if}
												{feedback.submitter.email}
											</div>
											<div class="mt-1 text-xs text-gray-500">
												{formatDistanceToNow(new Date(feedback.createdAt!))} ago
											</div>
										</div>
									</div>

									<div class="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
										<div>
											<div class="text-sm text-gray-400">Position</div>
											<div class="text-white">{feedback.position}</div>
										</div>
										{#if feedback.callsign}
											<div>
												<div class="text-sm text-gray-400">Callsign</div>
												<div class="font-mono text-white">{feedback.callsign}</div>
											</div>
										{/if}
									</div>

									{#if feedback.feedback}
										<div>
											<div class="mb-2 text-sm text-gray-400">Feedback</div>
											<div
												class="rounded-lg border border-slate-600/50 bg-slate-700/50 p-4 text-sm text-white"
											>
												{feedback.feedback}
											</div>
										</div>
									{/if}
								</div>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>

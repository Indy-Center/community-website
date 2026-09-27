<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { format, formatDistanceToNow } from 'date-fns';
	import { RATING_STARS, ratingLabel } from '$lib/utils/feedbackRatings';
	import {
		PUBLISH_MODE_LABELS,
		statusLabel,
		type FeedbackStatus,
		type PublishMode
	} from '$lib/utils/feedbackReview';
	import IconArrowLeft from '~icons/mdi/arrow-left';
	import IconCheck from '~icons/mdi/check';
	import IconClose from '~icons/mdi/close';
	import IconFlag from '~icons/mdi/flag';
	import IconBullhorn from '~icons/mdi/bullhorn';
	import IconComment from '~icons/mdi/comment-text';
	import IconWrench from '~icons/mdi/wrench';
	import IconAccountArrowRight from '~icons/mdi/account-arrow-right';
	import IconSwap from '~icons/mdi/swap-horizontal';
	import IconIncognito from '~icons/mdi/incognito';
	import IconAccount from '~icons/mdi/account';
	import AcceptActions from '$lib/components/feedback/AcceptActions.svelte';

	let { data, form } = $props();

	const feedback = $derived(data.feedback);
	const published = $derived(!!feedback.publishMode);

	type Named = { firstName: string; lastName: string; preferredName: string | null } | null;

	function getDisplayName(user: Named) {
		if (!user) return 'Unknown User';
		return user.preferredName || `${user.firstName} ${user.lastName}`;
	}

	function reviewerName(id: string | null) {
		if (!id) return 'nobody';
		return data.reviewers.find((r) => r.id === id)?.name ?? 'a former reviewer';
	}

	function getStatusColor(status: string) {
		switch (status) {
			case 'pending':
				return 'bg-sky-600/20 text-sky-300 border-sky-500/30';
			case 'follow_up':
				return 'bg-yellow-600/20 text-yellow-300 border-yellow-500/30';
			case 'approved':
				return 'bg-green-600/20 text-green-300 border-green-500/30';
			case 'rejected':
				return 'bg-red-600/20 text-red-300 border-red-500/30';
			default:
				return 'bg-gray-600/20 text-gray-300 border-gray-500/30';
		}
	}

	// Which status buttons to show; mirrors the transitions the server allows
	const TRANSITIONS: Record<FeedbackStatus, FeedbackStatus[]> = {
		pending: ['approved', 'follow_up', 'rejected'],
		follow_up: ['approved', 'rejected'],
		approved: ['follow_up', 'rejected'],
		rejected: ['approved', 'follow_up']
	};
	const nextStatuses = $derived(published ? [] : TRANSITIONS[feedback.status]);

	let note = $state('');
	let followUpAssignee = $state('');
	let commentType = $state<'comment' | 'action'>('comment');
	let commentBody = $state('');

	// Publish form, pre-filled from the submission
	let publishMode = $state<PublishMode>('identified');
	let pub = $state({ ...data.publishDraft });
	let submitting = $state(false);

	const submit: SubmitFunction = ({ cancel, action }) => {
		if (action.search === '?/publish') {
			const message =
				publishMode === 'identified'
					? "Publish this feedback to Discord and the public profile, with the pilot details? The Discord post can't be undone."
					: "Publish this feedback de-identified? It goes on the controller's private profile without pilot details and isn't posted to Discord. This can't be undone.";
			if (!confirm(message)) {
				cancel();
				return;
			}
		}
		submitting = true;
		return async ({ update, result }) => {
			submitting = false;
			await update({ reset: false });
			if (result.type === 'success') {
				note = '';
				commentBody = '';
			}
		};
	};

	const inputClass =
		'w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white placeholder-gray-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500 focus:outline-none disabled:opacity-50';
</script>

<svelte:head>
	<title>Feedback for {getDisplayName(feedback.controller)} - Admin - Indy Center</title>
</svelte:head>

<div class="space-y-6">
	<a
		href="/admin/feedback?status={feedback.status}"
		class="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-200"
	>
		<IconArrowLeft class="h-4 w-4" />
		Back to {statusLabel(feedback.status)}
	</a>

	<div class="flex flex-wrap items-center justify-between gap-4">
		<div>
			<h2 class="text-2xl font-semibold text-white">
				Feedback for {getDisplayName(feedback.controller)}
			</h2>
			<p class="mt-1 text-sm text-gray-400">
				Submitted {format(new Date(feedback.createdAt!), 'MMM d, yyyy HH:mm')} ({formatDistanceToNow(
					new Date(feedback.createdAt!)
				)} ago)
			</p>
		</div>
		<div class="flex items-center gap-2">
			<span class="rounded border px-2 py-1 text-xs {getStatusColor(feedback.status)}">
				{statusLabel(feedback.status)}
			</span>
			{#if feedback.publishMode}
				<span
					class="flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-600/20 px-2 py-1 text-xs text-emerald-300"
				>
					<IconBullhorn class="h-3 w-3" />
					Published · {PUBLISH_MODE_LABELS[feedback.publishMode]}
				</span>
			{/if}
		</div>
	</div>

	{#if form?.message}
		<div class="rounded-lg border border-red-500/40 bg-red-600/10 px-4 py-3 text-sm text-red-300">
			{form.message}
		</div>
	{:else if form && 'posted' in form && form.posted === false}
		<div
			class="rounded-lg border border-yellow-500/40 bg-yellow-600/10 px-4 py-3 text-sm text-yellow-200"
		>
			Published to the profile, but the Discord post failed. Check the logs.
		</div>
	{/if}

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-5">
		<div class="space-y-6 lg:col-span-3">
			<!-- Original submission -->
			<section class="rounded-lg border border-slate-700/50 bg-slate-800/50 p-6">
				<h3 class="mb-4 text-lg font-semibold text-white">Submission</h3>
				<dl class="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
					<div>
						<dt class="text-gray-400">Controller</dt>
						<dd class="text-white">
							{getDisplayName(feedback.controller)}
							<span class="text-gray-400">({feedback.controller?.cid})</span>
						</dd>
					</div>
					<div>
						<dt class="text-gray-400">Pilot</dt>
						<dd class="text-white">
							{getDisplayName(feedback.submitter)}
							<span class="text-gray-400">({feedback.submitter?.cid})</span>
							{#if feedback.submitter?.email}
								<div class="text-xs text-gray-400">{feedback.submitter.email}</div>
							{/if}
						</dd>
					</div>
					<div>
						<dt class="text-gray-400">Position</dt>
						<dd class="font-mono text-white">{feedback.position}</dd>
					</div>
					<div>
						<dt class="text-gray-400">Callsign</dt>
						<dd class="font-mono text-white">{feedback.callsign || '—'}</dd>
					</div>
					<div>
						<dt class="text-gray-400">Rating</dt>
						<dd class="text-white">{ratingLabel(feedback.rating)}</dd>
					</div>
					{#if feedback.status === 'follow_up'}
						<div>
							<dt class="text-gray-400">Assigned to</dt>
							<dd class="text-yellow-300">
								{feedback.assignee ? getDisplayName(feedback.assignee) : 'Unassigned'}
							</dd>
						</div>
					{/if}
				</dl>
				{#if feedback.feedback}
					<div
						class="mt-4 rounded-lg border border-slate-600/50 bg-slate-700/50 p-4 text-sm whitespace-pre-line text-white"
					>
						{feedback.feedback}
					</div>
				{/if}
			</section>

			<!-- Review actions -->
			{#if nextStatuses.length > 0}
				<section class="space-y-4 rounded-lg border border-slate-700/50 bg-slate-800/50 p-6">
					<h3 class="text-lg font-semibold text-white">
						{feedback.status === 'pending' ? 'Triage' : 'Change status'}
					</h3>

					{#if feedback.status === 'follow_up'}
						<form method="POST" action="?/assign" use:enhance={submit} class="flex gap-2">
							<select name="assigneeId" class={inputClass} value={feedback.assigneeId ?? ''}>
								<option value="">Unassigned</option>
								{#each data.reviewers as reviewer (reviewer.id)}
									<option value={reviewer.id}>{reviewer.name}</option>
								{/each}
							</select>
							<button
								type="submit"
								disabled={submitting}
								class="flex shrink-0 items-center gap-2 rounded-lg border border-slate-600 px-4 py-2 text-sm text-gray-200 hover:bg-slate-700/50"
							>
								<IconAccountArrowRight class="h-4 w-4" />
								Reassign
							</button>
						</form>
					{/if}

					<textarea
						bind:value={note}
						rows="2"
						maxlength="2000"
						class={inputClass}
						placeholder="Note for the log (optional)"
					></textarea>

					<div class="flex flex-wrap items-start gap-3">
						{#if feedback.status === 'pending'}
							<!-- New feedback can be accepted and published in one step -->
							<AcceptActions
								feedbackId={feedback.id}
								align="left"
								{note}
								onresult={(success) => {
									if (success) note = '';
								}}
							/>
						{:else if nextStatuses.includes('approved')}
							<form method="POST" action="?/accept" use:enhance={submit}>
								<input type="hidden" name="note" value={note} />
								<button
									type="submit"
									disabled={submitting}
									class="flex items-center gap-2 rounded-lg border border-green-600 bg-green-700 px-4 py-2 text-sm text-white hover:bg-green-600"
								>
									<IconCheck class="h-4 w-4" />
									Accept
								</button>
							</form>
						{/if}

						{#if nextStatuses.includes('follow_up')}
							<form method="POST" action="?/followUp" use:enhance={submit} class="flex gap-2">
								<input type="hidden" name="note" value={note} />
								<select name="assigneeId" bind:value={followUpAssignee} class={inputClass}>
									<option value="">Assign later</option>
									{#each data.reviewers as reviewer (reviewer.id)}
										<option value={reviewer.id}>
											{reviewer.name}{reviewer.id === data.userId ? ' (me)' : ''}
										</option>
									{/each}
								</select>
								<button
									type="submit"
									disabled={submitting}
									class="flex shrink-0 items-center gap-2 rounded-lg border border-yellow-600 bg-yellow-700 px-4 py-2 text-sm text-white hover:bg-yellow-600"
								>
									<IconFlag class="h-4 w-4" />
									Follow Up
								</button>
							</form>
						{/if}

						{#if nextStatuses.includes('rejected')}
							<form method="POST" action="?/reject" use:enhance={submit}>
								<input type="hidden" name="note" value={note} />
								<button
									type="submit"
									disabled={submitting}
									class="flex items-center gap-2 rounded-lg border border-red-600 bg-red-700 px-4 py-2 text-sm text-white hover:bg-red-600"
								>
									<IconClose class="h-4 w-4" />
									Reject
								</button>
							</form>
						{/if}
					</div>
				</section>
			{/if}

			<!-- Publish -->
			{#if feedback.status === 'approved' && !published}
				<section class="space-y-4 rounded-lg border border-emerald-700/40 bg-slate-800/50 p-6">
					<div>
						<h3 class="text-lg font-semibold text-white">Publish</h3>
						<p class="mt-1 text-sm text-gray-400">
							Edit anything below before it goes out. The original submission stays as it was.
						</p>
					</div>

					<form method="POST" action="?/publish" use:enhance={submit} class="space-y-4">
						<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
							<label
								class="flex cursor-pointer gap-3 rounded-lg border p-3 {publishMode === 'identified'
									? 'border-sky-500 bg-sky-600/10'
									: 'border-slate-600'}"
							>
								<input
									type="radio"
									name="mode"
									value="identified"
									bind:group={publishMode}
									class="mt-1"
								/>
								<span>
									<span class="flex items-center gap-1 font-medium text-white">
										<IconAccount class="h-4 w-4" /> Identified
									</span>
									<span class="text-xs text-gray-400">
										Posted to Discord and the public profile with the pilot's name and callsign
									</span>
								</span>
							</label>
							<label
								class="flex cursor-pointer gap-3 rounded-lg border p-3 {publishMode ===
								'deidentified'
									? 'border-sky-500 bg-sky-600/10'
									: 'border-slate-600'}"
							>
								<input
									type="radio"
									name="mode"
									value="deidentified"
									bind:group={publishMode}
									class="mt-1"
								/>
								<span>
									<span class="flex items-center gap-1 font-medium text-white">
										<IconIncognito class="h-4 w-4" /> De-identified
									</span>
									<span class="text-xs text-gray-400">
										Shown on the controller's private profile only, without pilot details. Not
										posted to Discord
									</span>
								</span>
							</label>
						</div>

						<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<label class="block text-sm text-gray-300">
								Rating
								<select name="rating" bind:value={pub.rating} class="{inputClass} mt-1">
									{#each Object.keys(RATING_STARS) as rating}
										<option value={rating}>{ratingLabel(rating)}</option>
									{/each}
								</select>
							</label>
							<label class="block text-sm text-gray-300">
								Position
								<input
									name="position"
									bind:value={pub.position}
									maxlength="100"
									required
									class="{inputClass} mt-1"
								/>
							</label>
							<label class="block text-sm text-gray-300">
								Pilot name
								<input
									name="pilotName"
									bind:value={pub.pilotName}
									maxlength="100"
									disabled={publishMode === 'deidentified'}
									placeholder={publishMode === 'deidentified' ? 'Hidden' : 'Leave blank to omit'}
									class="{inputClass} mt-1"
								/>
							</label>
							<label class="block text-sm text-gray-300">
								Callsign
								<input
									name="callsign"
									bind:value={pub.callsign}
									maxlength="20"
									disabled={publishMode === 'deidentified'}
									placeholder={publishMode === 'deidentified' ? 'Hidden' : 'Leave blank to omit'}
									class="{inputClass} mt-1 font-mono"
								/>
							</label>
						</div>
						<label class="block text-sm text-gray-300">
							Comments
							<textarea
								name="feedback"
								bind:value={pub.feedback}
								rows="5"
								maxlength="4000"
								class="{inputClass} mt-1"
							></textarea>
						</label>

						<div class="flex justify-end">
							<button
								type="submit"
								disabled={submitting}
								class="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
							>
								<IconBullhorn class="h-4 w-4" />
								Publish {PUBLISH_MODE_LABELS[publishMode].toLowerCase()}
							</button>
						</div>
					</form>
				</section>
			{:else if published}
				<section class="rounded-lg border border-emerald-700/40 bg-slate-800/50 p-6">
					<h3 class="mb-1 text-lg font-semibold text-white">Published</h3>
					<p class="mb-4 text-sm text-gray-400">
						{PUBLISH_MODE_LABELS[feedback.publishMode!]}
						{#if feedback.publishedAt}
							on {format(new Date(feedback.publishedAt), 'MMM d, yyyy')}
						{/if}
						· {feedback.publishMode === 'identified'
							? 'Discord and public profile'
							: 'Private profile only'}
					</p>
					<dl class="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
						<div>
							<dt class="text-gray-400">Rating</dt>
							<dd class="text-white">{ratingLabel(data.publishDraft.rating)}</dd>
						</div>
						<div>
							<dt class="text-gray-400">Position</dt>
							<dd class="font-mono text-white">{data.publishDraft.position}</dd>
						</div>
						{#if feedback.publishMode === 'identified'}
							<div>
								<dt class="text-gray-400">Pilot</dt>
								<dd class="text-white">
									{[feedback.publishedPilotName, feedback.publishedCallsign]
										.filter(Boolean)
										.join(' · ') || '—'}
								</dd>
							</div>
						{/if}
					</dl>
					{#if feedback.publishedFeedback}
						<div
							class="mt-4 rounded-lg border border-slate-600/50 bg-slate-700/50 p-4 text-sm whitespace-pre-line text-white"
						>
							{feedback.publishedFeedback}
						</div>
					{/if}
				</section>
			{/if}
		</div>

		<!-- Log -->
		<section
			class="h-fit space-y-4 rounded-lg border border-slate-700/50 bg-slate-800/50 p-6 lg:col-span-2"
		>
			<h3 class="text-lg font-semibold text-white">Log</h3>

			<ol class="space-y-4 border-l border-slate-600 pl-4">
				<li class="relative">
					<span class="absolute top-1.5 -left-[21px] h-2.5 w-2.5 rounded-full bg-sky-400"></span>
					<p class="text-sm text-gray-200">Submitted by {getDisplayName(feedback.submitter)}</p>
					<p class="text-xs text-gray-500">
						{format(new Date(feedback.createdAt!), 'MMM d, yyyy HH:mm')}
					</p>
				</li>
				{#each feedback.events as event (event.id)}
					<li class="relative">
						<span
							class="absolute top-1.5 -left-[21px] h-2.5 w-2.5 rounded-full {event.type ===
							'comment'
								? 'bg-slate-400'
								: event.type === 'action'
									? 'bg-purple-400'
									: event.type === 'published'
										? 'bg-emerald-400'
										: 'bg-yellow-400'}"
						></span>
						<p class="flex items-center gap-1 text-sm text-gray-200">
							{#if event.type === 'status'}
								<IconSwap class="h-4 w-4 text-gray-400" />
								{getDisplayName(event.user)} moved it to
								<span class="font-medium">{statusLabel(event.value ?? '')}</span>
							{:else if event.type === 'assigned'}
								<IconAccountArrowRight class="h-4 w-4 text-gray-400" />
								{getDisplayName(event.user)}
								{event.value ? `assigned it to ${reviewerName(event.value)}` : 'unassigned it'}
							{:else if event.type === 'published'}
								<IconBullhorn class="h-4 w-4 text-gray-400" />
								{getDisplayName(event.user)} published it
								{PUBLISH_MODE_LABELS[event.value as PublishMode]?.toLowerCase()}
							{:else if event.type === 'action'}
								<IconWrench class="h-4 w-4 text-gray-400" />
								{getDisplayName(event.user)} took action
							{:else}
								<IconComment class="h-4 w-4 text-gray-400" />
								{getDisplayName(event.user)} commented
							{/if}
						</p>
						{#if event.body}
							<p
								class="mt-1 rounded bg-slate-700/50 px-3 py-2 text-sm whitespace-pre-line text-gray-300"
							>
								{event.body}
							</p>
						{/if}
						<p class="mt-1 text-xs text-gray-500">
							{format(new Date(event.createdAt!), 'MMM d, yyyy HH:mm')}
						</p>
					</li>
				{/each}
			</ol>

			<form method="POST" action="?/comment" use:enhance={submit} class="space-y-2">
				<div class="flex gap-2 text-sm">
					<label
						class="flex cursor-pointer items-center gap-1 rounded-lg border px-3 py-1 {commentType ===
						'comment'
							? 'border-sky-500 text-sky-300'
							: 'border-slate-600 text-gray-400'}"
					>
						<input
							type="radio"
							name="type"
							value="comment"
							bind:group={commentType}
							class="sr-only"
						/>
						<IconComment class="h-4 w-4" /> Comment
					</label>
					<label
						class="flex cursor-pointer items-center gap-1 rounded-lg border px-3 py-1 {commentType ===
						'action'
							? 'border-purple-500 text-purple-300'
							: 'border-slate-600 text-gray-400'}"
					>
						<input
							type="radio"
							name="type"
							value="action"
							bind:group={commentType}
							class="sr-only"
						/>
						<IconWrench class="h-4 w-4" /> Action taken
					</label>
				</div>
				<textarea
					name="body"
					bind:value={commentBody}
					rows="3"
					maxlength="4000"
					required
					class={inputClass}
					placeholder={commentType === 'action'
						? 'e.g. Talked to the controller about phraseology on CMH_APP'
						: 'Add a comment'}
				></textarea>
				<div class="flex justify-end">
					<button
						type="submit"
						disabled={submitting || !commentBody.trim()}
						class="rounded-lg bg-sky-600 px-4 py-2 text-sm text-white hover:bg-sky-500 disabled:opacity-50"
					>
						Add to log
					</button>
				</div>
			</form>
		</section>
	</div>
</div>

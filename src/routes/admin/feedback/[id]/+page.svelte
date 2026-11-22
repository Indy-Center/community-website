<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import {
		Alert,
		Badge,
		Breadcrumbs,
		Button,
		ChoiceCard,
		confirmAction,
		DescriptionList,
		Field,
		Fieldset,
		Icon,
		Input,
		Link,
		Member,
		PageHeader,
		Panel,
		Radio,
		Select,
		Steps,
		Textarea,
		Time
	} from '@indy-center/centerline-svelte';
	import { mdiBullhorn, mdiSendOutline } from '@mdi/js';
	import { RATING_STARS, ratingLabel } from '$lib/utils/feedbackRatings';
	import {
		memberName,
		PUBLISH_MODE_LABELS,
		RATING_BADGES,
		STATUS_BADGES,
		reviewSteps,
		statusLabel,
		type FeedbackStatus,
		type PublishMode
	} from '$lib/utils/feedbackReview';
	import AcceptActions from '$lib/components/feedback/AcceptActions.svelte';

	let { data, form } = $props();

	const feedback = $derived(data.feedback);
	const published = $derived(!!feedback.publishMode);
	const controller = $derived(memberName(feedback.controller));

	function reviewerName(id: string) {
		return data.reviewers.find((r) => r.id === id)?.name ?? 'a former reviewer';
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
	// svelte-ignore state_referenced_locally
	let pub = $state({ ...data.publishDraft });
	let submitting = $state(false);

	const submit: SubmitFunction = async ({ cancel, action }) => {
		if (action.search === '?/publish') {
			const identified = publishMode === 'identified';
			const sure = await confirmAction({
				title: identified ? 'Publish to Discord?' : 'Publish de-identified?',
				message: identified
					? "It's posted to Discord with the pilot details you've given. The Discord post can't be undone."
					: "It's shown on the controller's private profile without the pilot's details, and isn't posted to Discord. This can't be undone.",
				confirmLabel: identified ? 'Publish to Discord' : 'Publish de-identified',
				danger: true
			});
			if (!sure) {
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

	// The audit trail: everything done to this feedback, then what happens next
	const steps = $derived(reviewSteps(feedback, reviewerName));
</script>

<svelte:head>
	<title>Feedback for {controller} | Admin | Indy Center</title>
</svelte:head>

<Breadcrumbs
	class="mb-4"
	items={[
		{ href: `/admin/feedback?status=${feedback.status}`, label: 'Feedback' },
		{ href: `/admin/feedback/${feedback.id}`, label: `Feedback for ${controller}` }
	]}
/>

<PageHeader title="Feedback for {controller}" class="mb-6">
	Received <Time value={feedback.createdAt!} show="datetime" /> ·
	<Badge size="sm" variant={STATUS_BADGES[feedback.status]} pill>
		{statusLabel(feedback.status)}
	</Badge>
	{#if feedback.publishMode}
		<Badge size="sm" variant="green" pill>
			Published {PUBLISH_MODE_LABELS[feedback.publishMode].toLowerCase()}
		</Badge>
	{/if}
</PageHeader>

{#if form?.message}
	<Alert level="danger" class="mb-6">{form.message}</Alert>
{:else if form && 'posted' in form && form.posted === false}
	<Alert level="caution" class="mb-6">
		Published to the profile, but the Discord post couldn't be queued. The log says so; check Sentry
		for why.
	</Alert>
{/if}

<div class="grid grid-cols-1 gap-6 lg:grid-cols-5">
	<div class="flex flex-col gap-6 lg:col-span-3">
		<Panel title="Submission" level={2}>
			<DescriptionList>
				<div>
					<dt>Controller</dt>
					<dd>
						{#if feedback.controller}
							<Member name={controller} cid={feedback.controller.cid} />
						{:else}
							Unknown member
						{/if}
					</dd>
				</div>
				<div>
					<dt>Pilot</dt>
					<dd>
						{#if feedback.submitter}
							<Member name={memberName(feedback.submitter)} cid={feedback.submitter.cid} />
							<Link href="mailto:{feedback.submitter.email}" class="block text-sm">
								{feedback.submitter.email}
							</Link>
						{:else}
							Unknown member
						{/if}
					</dd>
				</div>
				<div>
					<dt>Position</dt>
					<dd class="font-mono">{feedback.position}</dd>
				</div>
				<div>
					<dt>Callsign</dt>
					<dd class="font-mono">{feedback.callsign || 'Not given'}</dd>
				</div>
				<div>
					<dt>Rating</dt>
					<dd>
						<Badge size="sm" variant={RATING_BADGES[feedback.rating] ?? 'gray'}>
							{ratingLabel(feedback.rating)}
						</Badge>
					</dd>
				</div>
				{#if feedback.status === 'follow_up'}
					<div>
						<dt>Assigned to</dt>
						<dd>{feedback.assignee ? memberName(feedback.assignee) : 'Unassigned'}</dd>
					</div>
				{/if}
			</DescriptionList>
			{#if feedback.feedback}
				<p class="mt-4 rounded-lg bg-muted p-4 whitespace-pre-line">{feedback.feedback}</p>
			{/if}
		</Panel>

		{#if nextStatuses.length > 0}
			<Panel title={feedback.status === 'pending' ? 'Triage' : 'Change status'} level={2}>
				<div class="flex flex-col gap-6">
					{#if feedback.status === 'follow_up'}
						<form
							method="POST"
							action="?/assign"
							use:enhance={submit}
							class="flex flex-wrap items-end gap-3"
						>
							<Field label="Assigned to" class="min-w-56 flex-1">
								{#snippet children(control)}
									<Select {...control} name="assigneeId" value={feedback.assigneeId ?? ''}>
										<option value="">Unassigned</option>
										{#each data.reviewers as reviewer (reviewer.id)}
											<option value={reviewer.id}>{reviewer.name}</option>
										{/each}
									</Select>
								{/snippet}
							</Field>
							<Button type="submit" variant="secondary" busy={submitting} busyLabel="Saving">
								Reassign
							</Button>
						</form>
					{/if}

					<Field label="Note for the log" hint="Optional. Saved with the status you choose.">
						{#snippet children(control)}
							<Textarea {...control} bind:value={note} rows={2} maxlength={2000} />
						{/snippet}
					</Field>

					<div class="flex flex-wrap items-end gap-3">
						{#if feedback.status === 'pending'}
							<!-- New feedback can be accepted and published in one step -->
							<AcceptActions
								feedbackId={feedback.id}
								controllerName={controller}
								{note}
								onresult={(success) => {
									if (success) note = '';
								}}
							/>
						{:else if nextStatuses.includes('approved')}
							<form method="POST" action="?/accept" use:enhance={submit}>
								<input type="hidden" name="note" value={note} />
								<Button type="submit" busy={submitting} busyLabel="Saving">Accept</Button>
							</form>
						{/if}

						{#if nextStatuses.includes('rejected')}
							<form method="POST" action="?/reject" use:enhance={submit}>
								<input type="hidden" name="note" value={note} />
								<Button type="submit" variant="secondary" busy={submitting} busyLabel="Saving">
									Reject
								</Button>
							</form>
						{/if}
					</div>

					{#if nextStatuses.includes('follow_up')}
						<form
							method="POST"
							action="?/followUp"
							use:enhance={submit}
							class="flex flex-wrap items-end gap-3"
						>
							<input type="hidden" name="note" value={note} />
							<Field label="Follow up, worked by" class="min-w-56 flex-1">
								{#snippet children(control)}
									<Select {...control} name="assigneeId" bind:value={followUpAssignee}>
										<option value="">Assign later</option>
										{#each data.reviewers as reviewer (reviewer.id)}
											<option value={reviewer.id}>
												{reviewer.name}{reviewer.id === data.userId ? ' (me)' : ''}
											</option>
										{/each}
									</Select>
								{/snippet}
							</Field>
							<Button type="submit" variant="secondary" busy={submitting} busyLabel="Saving">
								Follow up
							</Button>
						</form>
					{/if}
				</div>
			</Panel>
		{/if}

		{#if feedback.status === 'approved' && !published}
			<Panel title="Publish" level={2}>
				<p class="mb-6 text-muted-foreground">
					Edit anything below before it goes out. The original submission stays as it was.
				</p>
				<form method="POST" action="?/publish" use:enhance={submit} class="flex flex-col gap-6">
					<Fieldset legend="Publish as" required>
						<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
							<ChoiceCard
								type="radio"
								label="Identified"
								name="mode"
								value="identified"
								bind:group={publishMode}
							>
								Posted to Discord with the pilot's name and callsign, and shown on the controller's
								private profile.
							</ChoiceCard>
							<ChoiceCard
								type="radio"
								label="De-identified"
								name="mode"
								value="deidentified"
								bind:group={publishMode}
							>
								Shown on the controller's private profile only, without the pilot's details. Not
								posted to Discord.
							</ChoiceCard>
						</div>
					</Fieldset>

					<div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
						<Field label="Rating" required>
							{#snippet children(control)}
								<Select {...control} name="rating" bind:value={pub.rating}>
									{#each Object.keys(RATING_STARS) as rating (rating)}
										<option value={rating}>{ratingLabel(rating)}</option>
									{/each}
								</Select>
							{/snippet}
						</Field>
						<Field label="Position" required>
							{#snippet children(control)}
								<Input {...control} name="position" bind:value={pub.position} maxlength={100} />
							{/snippet}
						</Field>
						{#if publishMode === 'identified'}
							<Field label="Pilot name" hint="Leave blank to leave it out.">
								{#snippet children(control)}
									<Input {...control} name="pilotName" bind:value={pub.pilotName} maxlength={100} />
								{/snippet}
							</Field>
							<Field label="Callsign" hint="Leave blank to leave it out.">
								{#snippet children(control)}
									<Input
										{...control}
										name="callsign"
										bind:value={pub.callsign}
										maxlength={20}
										class="font-mono"
									/>
								{/snippet}
							</Field>
						{/if}
					</div>

					<Field label="Comments">
						{#snippet children(control)}
							<Textarea
								{...control}
								name="feedback"
								bind:value={pub.feedback}
								rows={5}
								maxlength={4000}
							/>
						{/snippet}
					</Field>

					<div class="flex justify-end">
						<Button type="submit" busy={submitting} busyLabel="Publishing">
							<Icon path={publishMode === 'identified' ? mdiBullhorn : mdiSendOutline} />
							{publishMode === 'identified' ? 'Publish to Discord' : 'Publish de-identified'}
						</Button>
					</div>
				</form>
			</Panel>
		{:else if published}
			<Panel title="Published" level={2}>
				<p class="mb-4 text-muted-foreground">
					{PUBLISH_MODE_LABELS[feedback.publishMode!]}
					{#if feedback.publishedAt}
						· <Time value={feedback.publishedAt} show="datetime" />
					{/if}
					· {feedback.publishMode === 'identified'
						? 'Discord and private profile'
						: 'Private profile only'}
				</p>
				<DescriptionList>
					<div>
						<dt>Rating</dt>
						<dd>{ratingLabel(data.publishDraft.rating)}</dd>
					</div>
					<div>
						<dt>Position</dt>
						<dd class="font-mono">{data.publishDraft.position}</dd>
					</div>
					{#if feedback.publishMode === 'identified'}
						<div>
							<dt>Pilot</dt>
							<dd>
								{[feedback.publishedPilotName, feedback.publishedCallsign]
									.filter(Boolean)
									.join(' · ') || 'Left out'}
							</dd>
						</div>
					{/if}
				</DescriptionList>
				{#if feedback.publishedFeedback}
					<p class="mt-4 rounded-lg bg-muted p-4 whitespace-pre-line">
						{feedback.publishedFeedback}
					</p>
				{/if}
			</Panel>
		{/if}
	</div>

	<Panel title="Log" level={2} class="h-fit lg:col-span-2">
		<Steps {steps} class="mb-6" />

		<form method="POST" action="?/comment" use:enhance={submit} class="flex flex-col gap-4">
			<Fieldset legend="Add to the log">
				<Radio label="Comment" name="type" value="comment" bind:group={commentType} />
				<Radio label="Action taken" name="type" value="action" bind:group={commentType}>
					Something done about it, such as a talk with the controller.
				</Radio>
			</Fieldset>
			<Field label={commentType === 'action' ? 'What was done' : 'Your comment'} required>
				{#snippet children(control)}
					<Textarea {...control} name="body" bind:value={commentBody} rows={3} maxlength={4000} />
				{/snippet}
			</Field>
			<div class="flex justify-end">
				<Button type="submit" variant="secondary" busy={submitting} busyLabel="Saving">
					Add to log
				</Button>
			</div>
		</form>
	</Panel>
</div>

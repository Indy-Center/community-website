<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import {
		Badge,
		Button,
		EmptyState,
		Icon,
		Link,
		PageHeader,
		Table,
		Tabs,
		Th,
		Time
	} from '@indy-center/centerline-svelte';
	import { mdiMessageTextOutline } from '@mdi/js';
	import {
		FEEDBACK_STATUSES,
		memberName,
		PUBLISH_MODE_LABELS,
		RATING_BADGES,
		STATUS_LABELS
	} from '$lib/utils/feedbackReview';
	import { ratingLabel } from '$lib/utils/feedbackRatings';
	import AcceptActions from '$lib/components/feedback/AcceptActions.svelte';
	import FollowUpMenu from '$lib/components/feedback/FollowUpMenu.svelte';

	let { data } = $props();

	const EMPTY = {
		pending: { title: 'No new feedback', text: 'Everything has been triaged.' },
		follow_up: { title: 'No follow ups', text: 'Nothing is waiting on a follow up.' },
		approved: { title: 'No accepted feedback', text: 'Accepted feedback will show here.' },
		rejected: { title: 'No rejected feedback', text: 'Rejected feedback will show here.' }
	};

	function statusHref(status: string, mine = data.mine) {
		const params = new URLSearchParams({ status });
		if (mine) params.set('mine', '1');
		return `/admin/feedback?${params}`;
	}

	const tabs = $derived(
		FEEDBACK_STATUSES.map((status) => ({
			href: statusHref(status),
			label: `${STATUS_LABELS[status]} (${data.counts[status]})`
		}))
	);
	const showActions = $derived(data.status === 'pending');
	const showAssignee = $derived(data.status === 'follow_up');
	const showPublished = $derived(data.status === 'approved');
</script>

<svelte:head>
	<title>Feedback | Admin | Indy Center</title>
</svelte:head>

<PageHeader title="Feedback" class="mb-6">
	Triage new feedback, work follow ups, and publish accepted feedback.
	{#snippet actions()}
		<Button
			variant="secondary"
			pressed={data.mine}
			onclick={() => goto(statusHref(data.status, !data.mine))}
		>
			Assigned to me
		</Button>
	{/snippet}
</PageHeader>

<Tabs label="Feedback by status" items={tabs} current={statusHref(data.status)} class="mb-6" />

{#if data.feedback.length === 0}
	{@const empty = data.mine
		? { title: 'Nothing assigned to you', text: 'Follow ups assigned to you will show here.' }
		: EMPTY[data.status]}
	<EmptyState title={empty.title} level={2}>
		{#snippet icon()}<Icon path={mdiMessageTextOutline} />{/snippet}
		{empty.text}
	</EmptyState>
{:else}
	<Table>
		{#snippet caption()}{STATUS_LABELS[data.status]} feedback{/snippet}
		<thead>
			<tr>
				<Th scope="col">Controller</Th>
				<Th scope="col">Rating</Th>
				<Th scope="col">Pilot</Th>
				<Th scope="col">Received</Th>
				{#if showAssignee}<Th scope="col">Assigned to</Th>{/if}
				{#if showPublished}<Th scope="col">Published</Th>{/if}
				{#if showActions}<Th scope="col">Actions</Th>{/if}
			</tr>
		</thead>
		<tbody>
			{#each data.feedback as item (item.id)}
				{@const controller = memberName(item.controller)}
				<tr>
					<td class="max-w-sm">
						<Link href="/admin/feedback/{item.id}">{controller}</Link>
						<span class="block font-mono text-xs">{item.position}</span>
						{#if item.feedback}
							<span class="mt-1 line-clamp-2 block text-sm text-muted-foreground">
								{item.feedback}
							</span>
						{/if}
					</td>
					<td>
						<Badge size="sm" variant={RATING_BADGES[item.rating] ?? 'gray'}>
							{ratingLabel(item.rating)}
						</Badge>
					</td>
					<td>
						{memberName(item.submitter)}
						{#if item.callsign}<span class="block font-mono text-xs">{item.callsign}</span>{/if}
					</td>
					<td><Time value={item.createdAt!} show="datetime" /></td>
					{#if showAssignee}
						<td>{item.assignee ? memberName(item.assignee) : 'Unassigned'}</td>
					{/if}
					{#if showPublished}
						<td>
							{#if item.publishMode}
								<Badge size="sm" variant="green" pill>
									{PUBLISH_MODE_LABELS[item.publishMode]}
								</Badge>
							{:else}
								<Badge size="sm" variant="gray" pill>Not published</Badge>
							{/if}
						</td>
					{/if}
					{#if showActions}
						<td>
							<div class="flex flex-wrap items-center gap-2">
								<AcceptActions feedbackId={item.id} controllerName={controller} />
								<FollowUpMenu
									feedbackId={item.id}
									controllerName={controller}
									reviewers={data.reviewers}
									userId={data.userId}
								/>
								<form method="POST" action="/admin/feedback/{item.id}?/reject" use:enhance>
									<input type="hidden" name="note" value="" />
									<Button
										type="submit"
										variant="secondary"
										aria-label="Reject feedback for {controller}"
									>
										Reject
									</Button>
								</form>
							</div>
						</td>
					{/if}
				</tr>
			{/each}
		</tbody>
	</Table>
{/if}

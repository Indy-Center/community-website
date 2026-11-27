<script lang="ts">
	import {
		Badge,
		Card,
		Heading,
		Icon,
		PageHeader,
		StatCard,
		Text
	} from '@indy-center/centerline-svelte';
	import { mdiAccount, mdiAccountGroup, mdiCalendar, mdiChartLine, mdiMessage } from '@mdi/js';

	let { data } = $props();

	const stats = $derived(data.stats);
	const name = $derived(data.user?.preferredName || data.user?.firstName);
</script>

<svelte:head>
	<title>Admin | Indy Center</title>
</svelte:head>

<PageHeader title="Admin" class="mb-6">
	Welcome back{name ? `, ${name}` : ''}. Here's how the site stands.
</PageHeader>

<div class="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
	<StatCard label="Users" value={stats.users.total} detail="{stats.users.controllers} controllers">
		{#snippet icon()}<Icon path={mdiAccount} />{/snippet}
	</StatCard>
	<StatCard label="Events" value={stats.events.total} detail="{stats.events.published} published">
		{#snippet icon()}<Icon path={mdiCalendar} />{/snippet}
	</StatCard>
	<StatCard
		label="Event positions"
		value={stats.positions.total}
		detail="{stats.positions.assigned} assigned"
	>
		{#snippet icon()}<Icon path={mdiChartLine} />{/snippet}
	</StatCard>
	<StatCard
		label="Feedback"
		value={stats.feedback.total}
		detail="{stats.feedback.pending} waiting for review"
	>
		{#snippet icon()}<Icon path={mdiMessage} />{/snippet}
	</StatCard>
</div>

{#snippet section(title: string, href: string, icon: string, description: string, count: string)}
	<Card as="li" class="relative flex items-start gap-4">
		<Icon path={icon} size={28} class="shrink-0 text-muted-foreground" />
		<div class="min-w-0 flex-1">
			<div class="flex flex-wrap items-center gap-2">
				<Heading level={2} look={4}>
					<a
						{href}
						class="after:absolute after:inset-0 hover:underline focus-visible:outline-none focus-visible:after:rounded-lg focus-visible:after:outline-2 focus-visible:after:outline-ring"
						>{title}</a
					>
				</Heading>
				<Badge size="sm" variant="gray" pill>{count}</Badge>
			</div>
			<Text size="small" class="mt-1">{description}</Text>
		</div>
	</Card>
{/snippet}

<ul class="grid grid-cols-1 gap-4 lg:grid-cols-2">
	{@render section(
		'Users',
		'/admin/users',
		mdiAccountGroup,
		'Manage user accounts and roles. Certifications and endorsements are edited in the training app.',
		`${stats.users.total} users`
	)}
	{@render section(
		'Feedback',
		'/admin/feedback',
		mdiMessage,
		'Review and moderate controller feedback.',
		stats.feedback.pending > 0
			? `${stats.feedback.pending} waiting`
			: `${stats.feedback.total} total`
	)}
</ul>

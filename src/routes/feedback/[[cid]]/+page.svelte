<script lang="ts">
	import { page } from '$app/state';
	import { Button, Card, EmptyState, Icon, PageHeader } from '@indy-center/centerline-svelte';
	import { mdiLogin, mdiMessageOutline } from '@mdi/js';
	import { signInHref } from '$lib/utils/signIn';
	import FeedbackForm from '$lib/components/feedback/FeedbackForm.svelte';

	const { data } = $props();
</script>

<svelte:head>
	<title>Feedback | Indy Center</title>
</svelte:head>

<PageHeader title="Feedback" class="mb-8">
	Tell us how a controller did. It helps us recognise good work and improve.
</PageHeader>

{#if data.user}
	<Card>
		<FeedbackForm data={data.form} controllers={data.controllers} />
	</Card>
{:else}
	<EmptyState title="Sign in to send feedback" level={2}>
		{#snippet icon()}<Icon path={mdiMessageOutline} />{/snippet}
		Feedback is tied to your VATSIM account, so sign in first.
		{#snippet action()}
			<Button href={signInHref(page.url.pathname)}>
				<Icon path={mdiLogin} />
				Sign in with VATSIM
			</Button>
		{/snippet}
	</EmptyState>
{/if}

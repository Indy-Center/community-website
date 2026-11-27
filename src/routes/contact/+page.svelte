<script lang="ts">
	import { EmptyState, Icon, PageHeader } from '@indy-center/centerline-svelte';
	import { mdiEmailOutline } from '@mdi/js';
</script>

<svelte:head>
	<title>Contact us | Indy Center</title>
</svelte:head>

<PageHeader title="Contact us" class="mb-8" />

<EmptyState title="Coming soon" level={2}>
	{#snippet icon()}<Icon path={mdiEmailOutline} />{/snippet}
	We're working on a better way for you to get in touch with Indy Center. Check back soon.
</EmptyState>

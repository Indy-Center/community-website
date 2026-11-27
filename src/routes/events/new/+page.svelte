<script lang="ts">
	import { Card, PageHeader } from '@indy-center/centerline-svelte';
	import EventForm from '$lib/components/events/EventForm.svelte';

	const { data } = $props();
</script>

<svelte:head>
	<title>New event | Indy Center</title>
</svelte:head>

<PageHeader title="New event" class="mb-8">
	Set up an event. It stays a draft until you publish it.
</PageHeader>

<Card>
	<EventForm data={data.form} />
</Card>

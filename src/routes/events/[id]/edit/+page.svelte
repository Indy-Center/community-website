<script lang="ts">
	import { Card, PageHeader } from '@indy-center/centerline-svelte';
	import EventForm from '$lib/components/events/EventForm.svelte';

	const { data } = $props();
</script>

<svelte:head>
	<title>Edit event | Indy Center</title>
</svelte:head>

<PageHeader title="Edit event" class="mb-8" />

<Card>
	<EventForm data={data.form} />
</Card>

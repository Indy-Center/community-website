<script lang="ts">
	import EventForm from '$lib/components/events/EventForm.svelte';

	const { data } = $props();
</script>

<div class="mb-8">
	<h1 class="text-3xl font-bold text-white">Create New Event</h1>
	<p class="mt-2 text-gray-400">Fill out the form below to create a new event</p>
</div>

<div class="mx-auto">
	<div class="overflow-hidden rounded-lg bg-slate-800/80 shadow-xl backdrop-blur-sm">
		<div class="px-8 py-6">
			<EventForm data={data.form} />
		</div>
	</div>
</div>

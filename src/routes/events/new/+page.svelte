<script lang="ts">
	import { enhance } from '$app/forms';
	import type { VatsimEvent } from '$lib/types/vatsim.js';
	import SuperDebug, { dateProxy, superForm } from 'sveltekit-superforms';

	const { data } = $props();
	const { vatsimEvents } = data;

	const { form, errors } = superForm(data.form);

	const startTimeProxy = dateProxy(form, 'startTime', { format: 'datetime' });
	const endTimeProxy = dateProxy(form, 'endTime', { format: 'datetime' });

	function copyVatsimEventToForm(vatsimEventId: number) {
		const vatsimEvent = vatsimEvents.find((event) => event.id === vatsimEventId);
		if (!vatsimEvent) {
			return;
		}
		console.log(vatsimEvent.start_time);
		console.log(vatsimEvent.end_time);

		$form.name = vatsimEvent.name;
		$form.bannerUrl = vatsimEvent.banner;
		$form.description = vatsimEvent.description;

		// Create dates but offset by timezone to counteract datetime-local conversion
		const startDate = new Date(vatsimEvent.start_time);
		const endDate = new Date(vatsimEvent.end_time);

		// Just set the dates directly - they'll display in local time
		$form.startTime = startDate;
		$form.endTime = endDate;
	}
</script>

<div class="mb-8">
	<h1 class="text-3xl font-bold text-white">Create New Event</h1>
	<p class="mt-2 text-gray-400">Fill out the form below to create a new event</p>
</div>

<div class="mx-auto max-w-4xl">
	<div class="overflow-hidden rounded-lg bg-slate-800/80 shadow-xl backdrop-blur-sm">
		<div class="px-8 py-6">
			<form method="post" use:enhance>
				{#if $errors}
					<div class="mb-4 rounded-lg bg-red-500 p-4 text-white">
						<p class="text-sm">Please fix the errors in the form</p>
						<ul class="list-disc pl-5">
							{#each Object.values($errors) as error}
								<li>{JSON.stringify(error)}</li>
							{/each}
						</ul>
					</div>
				{/if}
				<div class="space-y-6">
					<!-- Basic Event Information -->
					<div class="space-y-4">
						<h2 class="text-lg font-semibold text-white">Event Details</h2>

						<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<div class="sm:col-span-2">
								<label for="vatsimEventId" class="mb-1 block text-sm font-medium text-gray-300"
									>VATSIM Event <span class="text-gray-500">(optional)</span></label
								>
								<select
									name="vatsimEventId"
									bind:value={$form.vatsimEventId}
									onchange={() => {
										copyVatsimEventToForm($form.vatsimEventId ?? 0);
									}}
									class="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-white transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-500 focus:outline-none"
								>
									<option value="">Select a VATSIM Event (optional)</option>
									{#each vatsimEvents as event}
										<option value={event.id}>{event.name}</option>
									{/each}
								</select>
							</div>
							<div class="sm:col-span-2">
								<label for="name" class="mb-1 block text-sm font-medium text-gray-300"
									>Event Name</label
								>
								<input
									type="text"
									name="name"
									bind:value={$form.name}
									class="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-white placeholder-gray-400 transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-500 focus:outline-none"
									placeholder="Enter event name"
								/>
							</div>

							<div class="sm:col-span-2">
								<label for="bannerUrl" class="mb-1 block text-sm font-medium text-gray-300"
									>Starts At (Local Time)</label
								>
								<input
									type="datetime-local"
									name="startTime"
									bind:value={$startTimeProxy}
									step="60"
									class="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-white placeholder-gray-400 transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-500 focus:outline-none"
								/>
							</div>
							<div class="sm:col-span-2">
								<label for="bannerUrl" class="mb-1 block text-sm font-medium text-gray-300"
									>Ends At (Local Time)</label
								>
								<input
									type="datetime-local"
									name="endTime"
									bind:value={$endTimeProxy}
									step="60"
									class="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-white placeholder-gray-400 transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-500 focus:outline-none"
								/>
							</div>

							<div class="sm:col-span-2">
								<label for="description" class="mb-1 block text-sm font-medium text-gray-300"
									>Description</label
								>
								<textarea
									name="description"
									bind:value={$form.description}
									rows="4"
									class="w-full resize-none rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-white placeholder-gray-400 transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-500 focus:outline-none"
									placeholder="Describe your event..."
								></textarea>
							</div>

							<div class="sm:col-span-2">
								<label for="bannerUrl" class="mb-1 block text-sm font-medium text-gray-300"
									>Banner URL <span class="text-gray-500">(optional)</span></label
								>
								<input
									type="url"
									name="bannerUrl"
									bind:value={$form.bannerUrl}
									class="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-white placeholder-gray-400 transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-500 focus:outline-none"
									placeholder="https://example.com/banner.jpg"
								/>
							</div>

							<div>
								<label for="type" class="mb-1 block text-sm font-medium text-gray-300"
									>Event Type</label
								>
								<select
									name="type"
									bind:value={$form.type}
									class="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-white transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-500 focus:outline-none"
								>
									<option value="">Select Type</option>
									<option value="community">Community</option>
									<option value="support">Support</option>
								</select>
							</div>

							<div>
								<label for="rosterType" class="mb-1 block text-sm font-medium text-gray-300"
									>Roster Type</label
								>
								<select
									name="rosterType"
									bind:value={$form.rosterType}
									class="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-white transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-500 focus:outline-none"
								>
									<option value="">Select Roster Type</option>
									<option value="none">None</option>
									<option value="open">Open</option>
									<option value="assigned">Assigned</option>
								</select>
							</div>
						</div>
					</div>

					<!-- Submit Button -->
					<div class="flex justify-end border-t border-slate-600 pt-6">
						<button
							type="submit"
							class="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-6 py-3 text-sm font-medium text-white shadow-lg transition-all hover:bg-sky-700 hover:shadow-xl focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-800 focus:outline-none"
						>
							Create Event
						</button>
					</div>
				</div>
			</form>
		</div>
	</div>
</div>

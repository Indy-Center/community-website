<script lang="ts">
	import { superForm, dateProxy } from 'sveltekit-superforms';

	import type { SuperValidated, Infer } from 'sveltekit-superforms';
	import type { EventSchema } from '$lib/forms/events';

	const { data }: { data: SuperValidated<Infer<EventSchema>> } = $props();

	const { form, errors, enhance, constraints } = superForm(data);

	const startTimeProxy = dateProxy(form, 'startTime', { format: 'datetime' });
	const endTimeProxy = dateProxy(form, 'endTime', { format: 'datetime' });
</script>


<form method="POST" use:enhance>
	<div class="space-y-6">
		<!-- Basic Event Information -->
		<div class="space-y-4">
			<h2 class="text-lg font-semibold text-white">Event Details</h2>

			<div class="space-y-6">
				<!-- Event Name -->
				<div>
					<label for="name" class="mb-2 block text-sm font-medium text-gray-300"
						>Event Name {#if $errors.name}<span class="text-red-400">- {$errors.name}</span>{/if}</label
					>
					<input
						type="text"
						name="name"
						bind:value={$form.name}
						class="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-white placeholder-gray-400 transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-500 focus:outline-none"
						placeholder="Enter event name"
						aria-invalid={$errors.name ? 'true' : undefined}
						{...$constraints.name}
					/>
				</div>

				<!-- Event Times -->
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div>
						<label for="startTime" class="mb-2 block text-sm font-medium text-gray-300"
							>Start Time (Zulu) {#if $errors.startTime}<span class="text-red-400">- {$errors.startTime}</span>{/if}</label
						>
						<input
							type="datetime-local"
							name="startTime"
							bind:value={$startTimeProxy}
							step="60"
							class="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-white placeholder-gray-400 transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-500 focus:outline-none"
							aria-invalid={$errors.startTime ? 'true' : undefined}
							{...$constraints.startTime}
						/>
					</div>
					<div>
						<label for="endTime" class="mb-2 block text-sm font-medium text-gray-300"
							>End Time (Zulu) {#if $errors.endTime}<span class="text-red-400">- {$errors.endTime}</span>{/if}</label
						>
						<input
							type="datetime-local"
							name="endTime"
							bind:value={$endTimeProxy}
							step="60"
							class="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-white placeholder-gray-400 transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-500 focus:outline-none"
							aria-invalid={$errors.endTime ? 'true' : undefined}
							{...$constraints.endTime}
						/>
					</div>
				</div>

				<!-- Event Classification -->
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div>
						<label for="type" class="mb-2 block text-sm font-medium text-gray-300"
							>Event Type {#if $errors.type}<span class="text-red-400">- {$errors.type}</span>{/if}</label
						>
						<select
							name="type"
							bind:value={$form.type}
							class="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-white transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-500 focus:outline-none"
							aria-invalid={$errors.type ? 'true' : undefined}
							{...$constraints.type}
						>
							<option value="">Select Type</option>
							<option value="community">Community</option>
							<option value="support">Support</option>
						</select>
					</div>

					<div>
						<label for="rosterType" class="mb-2 block text-sm font-medium text-gray-300"
							>Roster Type {#if $errors.rosterType}<span class="text-red-400">- {$errors.rosterType}</span>{/if}</label
						>
						<select
							name="rosterType"
							bind:value={$form.rosterType}
							class="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-white transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-500 focus:outline-none"
							aria-invalid={$errors.rosterType ? 'true' : undefined}
							{...$constraints.rosterType}
						>
							<option value="">Select Roster Type</option>
							<option value="none">None</option>
							<option value="open">Open</option>
							<option value="assigned">Assigned</option>
						</select>
					</div>
				</div>

				<!-- Description -->
				<div>
					<label for="description" class="mb-2 block text-sm font-medium text-gray-300"
						>Description {#if $errors.description}<span class="text-red-400">- {$errors.description}</span>{/if}</label
					>
					<textarea
						name="description"
						bind:value={$form.description}
						rows="4"
						class="w-full resize-none rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-white placeholder-gray-400 transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-500 focus:outline-none"
						placeholder="Describe your event..."
						aria-invalid={$errors.description ? 'true' : undefined}
						{...$constraints.description}
					></textarea>
				</div>

				<!-- Banner URL -->
				<div>
					<label for="bannerUrl" class="mb-2 block text-sm font-medium text-gray-300"
						>Banner URL <span class="text-gray-500">(optional)</span> {#if $errors.bannerUrl}<span class="text-red-400">- {$errors.bannerUrl}</span>{/if}</label
					>
					<input
						type="url"
						name="bannerUrl"
						bind:value={$form.bannerUrl}
						class="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-white placeholder-gray-400 transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-500 focus:outline-none"
						placeholder="https://example.com/banner.jpg"
						aria-invalid={$errors.bannerUrl ? 'true' : undefined}
						{...$constraints.bannerUrl}
					/>
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

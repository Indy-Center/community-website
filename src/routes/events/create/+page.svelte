<script lang="ts">
	import PageHero from '$lib/components/PageHero.svelte';
	import { superForm } from 'sveltekit-superforms';
	import IconCreate from '~icons/mdi/plus';

	let { data } = $props();
	let { form: serverForm } = data;

	const { form, errors, enhance, message } = superForm(serverForm, {
		resetForm: false
	});
</script>

<svelte:head>
	<title>Create Event - Indy Center</title>
</svelte:head>

<PageHero size="compact">
	<h1 class="mb-1 text-xl font-bold text-white sm:text-lg md:text-lg lg:text-xl">
		Create New Event
	</h1>
	<p class="mx-auto mb-1 max-w-2xl text-xs leading-tight text-gray-300 sm:text-xs lg:text-sm">
		Create a new event for Indy Center.
	</p>
</PageHero>

<main class="mx-auto max-w-4xl px-6 py-8">
	<!-- Event Creation Form -->
	<div
		class="border-opacity-50 bg-opacity-50 rounded-xl border border-slate-700 bg-slate-800 p-8 backdrop-blur-sm"
	>
		<h2 class="mb-6 text-xl font-semibold text-white">Event Details</h2>

		{#if $message}
			<div
				class="border-opacity-20 bg-opacity-10 mb-6 rounded-xl border border-red-500 bg-red-500 p-4 backdrop-blur-sm"
			>
				<p class="text-sm font-medium text-red-300">{$message}</p>
			</div>
		{/if}

		<form method="POST" action="?/create" use:enhance class="space-y-6">
			<!-- Event Name -->
			<div class="space-y-2">
				<label class="text-sm font-medium text-gray-200" for="name">
					Event Name <span class="text-red-400">*</span>
				</label>
				<input
					id="name"
					name="name"
					type="text"
					bind:value={$form.name}
					placeholder="Enter a descriptive event name"
					class="border-opacity-50 bg-opacity-50 focus:ring-opacity-20 w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 text-white placeholder-gray-400 backdrop-blur-sm transition-all focus:border-sky-500 focus:ring-2 focus:ring-sky-500 focus:outline-none"
					class:border-red-500={$errors.name}
					class:border-opacity-50={$errors.name}
					class:bg-red-500={$errors.name}
					class:bg-opacity-5={$errors.name}
				/>
				{#if $errors.name}
					<p class="text-xs text-red-400">{$errors.name}</p>
				{/if}
			</div>

			<!-- Event Type & Roster Type -->
			<div class="grid gap-6 sm:grid-cols-2">
				<div class="space-y-2">
					<label class="text-sm font-medium text-gray-200" for="type">
						Event Type <span class="text-red-400">*</span>
					</label>
					<input
						id="type"
						name="type"
						type="text"
						bind:value={$form.type}
						placeholder="e.g., Event, Training, FNO"
						class="border-opacity-50 bg-opacity-50 focus:ring-opacity-20 w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 text-white placeholder-gray-400 backdrop-blur-sm transition-all focus:border-sky-500 focus:ring-2 focus:ring-sky-500 focus:outline-none"
						class:border-red-500={$errors.type}
						class:border-opacity-50={$errors.type}
						class:bg-red-500={$errors.type}
						class:bg-opacity-5={$errors.type}
					/>
					{#if $errors.type}
						<p class="text-xs text-red-400">{$errors.type}</p>
					{/if}
				</div>

				<div class="space-y-2">
					<label class="text-sm font-medium text-gray-200" for="rosterType">
						Roster Type <span class="text-red-400">*</span>
					</label>
					<select
						id="rosterType"
						name="rosterType"
						bind:value={$form.rosterType}
						class="border-opacity-50 bg-opacity-50 focus:ring-opacity-20 w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 text-white backdrop-blur-sm transition-all focus:border-sky-500 focus:ring-2 focus:ring-sky-500 focus:outline-none"
						class:border-red-500={$errors.rosterType}
						class:border-opacity-50={$errors.rosterType}
						class:bg-red-500={$errors.rosterType}
						class:bg-opacity-5={$errors.rosterType}
					>
						<option value="">Select roster type</option>
						<option value="open">Open</option>
						<option value="assigned">Assigned</option>
						<option value="none">No Roster</option>
					</select>
					{#if $errors.rosterType}
						<p class="text-xs text-red-400">{$errors.rosterType}</p>
					{/if}
				</div>
			</div>

			<!-- Start & End Time -->
			<div class="grid gap-6 sm:grid-cols-2">
				<div class="space-y-2">
					<label class="text-sm font-medium text-gray-200" for="startTime">
						Start Time (UTC) <span class="text-red-400">*</span>
					</label>
					<input
						id="startTime"
						name="startTime"
						type="datetime-local"
						bind:value={$form.startTime}
						class="border-opacity-50 bg-opacity-50 focus:ring-opacity-20 w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 text-white backdrop-blur-sm transition-all focus:border-sky-500 focus:ring-2 focus:ring-sky-500 focus:outline-none"
						class:border-red-500={$errors.startTime}
						class:border-opacity-50={$errors.startTime}
						class:bg-red-500={$errors.startTime}
						class:bg-opacity-5={$errors.startTime}
					/>
					{#if $errors.startTime}
						<p class="text-xs text-red-400">{$errors.startTime}</p>
					{/if}
				</div>

				<div class="space-y-2">
					<label class="text-sm font-medium text-gray-200" for="endTime">
						End Time (UTC) <span class="text-red-400">*</span>
					</label>
					<input
						id="endTime"
						name="endTime"
						type="datetime-local"
						bind:value={$form.endTime}
						class="border-opacity-50 bg-opacity-50 focus:ring-opacity-20 w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 text-white backdrop-blur-sm transition-all focus:border-sky-500 focus:ring-2 focus:ring-sky-500 focus:outline-none"
						class:border-red-500={$errors.endTime}
						class:border-opacity-50={$errors.endTime}
						class:bg-red-500={$errors.endTime}
						class:bg-opacity-5={$errors.endTime}
					/>
					{#if $errors.endTime}
						<p class="text-xs text-red-400">{$errors.endTime}</p>
					{/if}
				</div>
			</div>

			<!-- Banner URL -->
			<div class="space-y-2">
				<label class="text-sm font-medium text-gray-200" for="bannerUrl">
					Banner URL <span class="text-red-400">*</span>
				</label>
				<input
					id="bannerUrl"
					name="bannerUrl"
					type="url"
					bind:value={$form.bannerUrl}
					placeholder="https://example.com/event-banner.jpg"
					class="border-opacity-50 bg-opacity-50 focus:ring-opacity-20 w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 text-white placeholder-gray-400 backdrop-blur-sm transition-all focus:border-sky-500 focus:ring-2 focus:ring-sky-500 focus:outline-none"
					class:border-red-500={$errors.bannerUrl}
					class:border-opacity-50={$errors.bannerUrl}
					class:bg-red-500={$errors.bannerUrl}
					class:bg-opacity-5={$errors.bannerUrl}
				/>
				{#if $errors.bannerUrl}
					<p class="text-xs text-red-400">{$errors.bannerUrl}</p>
				{/if}
			</div>

			<!-- Description -->
			<div class="space-y-2">
				<label class="text-sm font-medium text-gray-200" for="description">
					Description <span class="text-red-400">*</span>
				</label>
				<textarea
					id="description"
					name="description"
					bind:value={$form.description}
					rows="4"
					placeholder="Provide a detailed description of your event..."
					class="border-opacity-50 bg-opacity-50 focus:ring-opacity-20 w-full resize-none rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 text-white placeholder-gray-400 backdrop-blur-sm transition-all focus:border-sky-500 focus:ring-2 focus:ring-sky-500 focus:outline-none"
					class:border-red-500={$errors.description}
					class:border-opacity-50={$errors.description}
					class:bg-red-500={$errors.description}
					class:bg-opacity-5={$errors.description}
				></textarea>
				{#if $errors.description}
					<p class="text-xs text-red-400">{$errors.description}</p>
				{/if}
			</div>

			<!-- Form Actions -->
			<div
				class="border-opacity-50 flex flex-col-reverse gap-3 border-t border-slate-700 pt-6 sm:flex-row sm:justify-end"
			>
				<div class="flex gap-3">
					<a
						href="/events"
						class="border-opacity-50 bg-opacity-50 hover:bg-opacity-50 inline-flex items-center justify-center rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm font-medium text-gray-300 backdrop-blur-sm transition-all hover:bg-slate-700 hover:text-white"
					>
						Cancel
					</a>
				</div>
				<button
					type="submit"
					class="inline-flex items-center justify-center gap-2
						rounded-lg bg-sky-600 px-6 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:bg-sky-700 hover:shadow-xl focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-900 focus:outline-none"
				>
					<IconCreate class="h-4 w-4" />
					Create Event
				</button>
			</div>
		</form>
	</div>
</main>

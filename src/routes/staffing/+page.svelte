<script lang="ts">
	import { page } from '$app/state';
	import { superForm } from 'sveltekit-superforms';
	import { signInHref } from '$lib/utils/signIn';
	import IconAccount from '~icons/mdi/account';
	import type { StaffingMessage } from './+page.server';

	const { data } = $props();

	// svelte-ignore state_referenced_locally
	const { form, errors, enhance, constraints, message, submitting } = superForm(data.form);
	const status = $derived($message as StaffingMessage | undefined);

	const inputClass =
		'w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-white placeholder-gray-400 transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-500 focus:outline-none';
</script>

<svelte:head>
	<title>Indy Center | Request ATC Staffing</title>
</svelte:head>

{#snippet label(id: string, text: string, error: string[] | undefined, optional = false)}
	<label for={id} class="mb-2 block text-sm font-medium text-gray-300">
		{text}
		{#if optional}<span class="text-gray-500">(optional)</span>{/if}
		{#if error}<span class="text-red-400">- {error[0]}</span>{/if}
	</label>
{/snippet}

<div class="mb-8">
	<h1 class="text-3xl font-bold text-white">Request ATC Staffing</h1>
	<p class="mt-2 max-w-3xl text-gray-400">
		Running a fly-in, group flight or virtual airline event through Indy Center airspace? Tell our
		Events Team about it and we'll do our best to have controllers on. Please ask at least two weeks
		ahead.
	</p>
</div>

<div
	class="mx-auto max-w-4xl rounded-lg bg-slate-800/80 px-6 py-6 shadow-xl backdrop-blur-sm sm:px-8"
>
	{#if !data.signedIn}
		<div class="flex flex-col items-center gap-4 py-4">
			<p class="text-gray-400">Connect your VATSIM account to request staffing.</p>
			<a
				href={signInHref(page.url.pathname)}
				class="flex w-fit items-center justify-center space-x-2 rounded-lg border border-sky-500/30 bg-sky-600/40 px-4 py-3 text-sm font-medium text-white transition-colors duration-200 hover:border-sky-400/50 hover:bg-sky-500/50"
			>
				<IconAccount class="h-5 w-5" />
				<span>Connect VATSIM Account</span>
			</a>
		</div>
	{:else}
		<form method="POST" use:enhance class="space-y-6">
			{#if status}
				<div
					role={status.type === 'error' ? 'alert' : 'status'}
					class="rounded-lg border px-6 py-4 font-medium {status.type === 'success'
						? 'border-green-400/30 bg-green-400/10 text-green-300'
						: 'border-red-400/30 bg-red-400/10 text-red-300'}"
				>
					{status.text}
				</div>
			{/if}

			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div>
					{@render label('organization', 'Organization', $errors.organization)}
					<input
						id="organization"
						name="organization"
						bind:value={$form.organization}
						placeholder="e.g. Delta Virtual Airlines"
						class={inputClass}
						aria-invalid={$errors.organization ? 'true' : undefined}
						{...$constraints.organization}
					/>
				</div>
				<div>
					{@render label('eventName', 'Event name', $errors.eventName)}
					<input
						id="eventName"
						name="eventName"
						bind:value={$form.eventName}
						placeholder="e.g. Midwest Fly-In"
						class={inputClass}
						aria-invalid={$errors.eventName ? 'true' : undefined}
						{...$constraints.eventName}
					/>
				</div>
			</div>

			<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
				<div>
					{@render label('date', 'Date (Zulu)', $errors.date)}
					<input
						id="date"
						type="date"
						name="date"
						bind:value={$form.date}
						class={inputClass}
						aria-invalid={$errors.date ? 'true' : undefined}
						{...$constraints.date}
					/>
				</div>
				<div>
					{@render label('startTime', 'Start (Zulu)', $errors.startTime)}
					<input
						id="startTime"
						type="time"
						name="startTime"
						bind:value={$form.startTime}
						class={inputClass}
						aria-invalid={$errors.startTime ? 'true' : undefined}
						{...$constraints.startTime}
					/>
				</div>
				<div>
					{@render label('endTime', 'End (Zulu)', $errors.endTime)}
					<input
						id="endTime"
						type="time"
						name="endTime"
						bind:value={$form.endTime}
						class={inputClass}
						aria-invalid={$errors.endTime ? 'true' : undefined}
						{...$constraints.endTime}
					/>
				</div>
			</div>

			<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
				<div class="sm:col-span-2">
					{@render label('airports', 'Airports involved', $errors.airports)}
					<input
						id="airports"
						name="airports"
						bind:value={$form.airports}
						placeholder="e.g. KIND, KCVG, KSDF"
						class={inputClass}
						aria-invalid={$errors.airports ? 'true' : undefined}
						{...$constraints.airports}
					/>
				</div>
				<div>
					{@render label('pilotCount', 'Expected pilots', $errors.pilotCount)}
					<input
						id="pilotCount"
						type="number"
						name="pilotCount"
						bind:value={$form.pilotCount}
						class={inputClass}
						aria-invalid={$errors.pilotCount ? 'true' : undefined}
						{...$constraints.pilotCount}
					/>
				</div>
			</div>

			<div>
				{@render label('link', 'Event page or Discord invite', $errors.link, true)}
				<input
					id="link"
					type="url"
					name="link"
					bind:value={$form.link}
					placeholder="https://"
					class={inputClass}
					aria-invalid={$errors.link ? 'true' : undefined}
					{...$constraints.link}
				/>
			</div>

			<fieldset>
				<legend class="mb-2 text-sm font-medium text-gray-300">
					How can we reach you? <span class="text-gray-500">(at least one)</span>
				</legend>
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div>
						{@render label('email', 'Email', $errors.email)}
						<input
							id="email"
							type="email"
							name="email"
							bind:value={$form.email}
							placeholder="you@example.com"
							class={inputClass}
							aria-invalid={$errors.email ? 'true' : undefined}
							{...$constraints.email}
						/>
					</div>
					<div>
						{@render label('discord', 'Discord username', $errors.discord)}
						<input
							id="discord"
							name="discord"
							bind:value={$form.discord}
							placeholder="e.g. pilot_pat"
							class={inputClass}
							aria-invalid={$errors.discord ? 'true' : undefined}
							{...$constraints.discord}
						/>
					</div>
				</div>
			</fieldset>

			<div>
				{@render label('details', 'About the event', $errors.details)}
				<textarea
					id="details"
					name="details"
					bind:value={$form.details}
					rows="6"
					placeholder="Routes, expected flow, which facilities you'd most like staffed, anything else we should know..."
					class="{inputClass} resize-y py-3"
					aria-invalid={$errors.details ? 'true' : undefined}
					{...$constraints.details}
				></textarea>
			</div>

			<div class="border-t border-slate-600 pt-6">
				<button
					type="submit"
					disabled={$submitting}
					class="inline-flex w-full items-center justify-center rounded-lg bg-sky-600 px-8 py-3 text-sm font-medium text-white shadow-lg transition-all hover:bg-sky-700 focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-800 focus:outline-none disabled:opacity-60 sm:w-auto"
				>
					{$submitting ? 'Sending…' : 'Send Request'}
				</button>
			</div>
		</form>
	{/if}
</div>

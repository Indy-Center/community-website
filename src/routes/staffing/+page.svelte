<script lang="ts">
	import { page } from '$app/state';
	import { superForm } from 'sveltekit-superforms';
	import {
		Alert,
		Button,
		Card,
		DateTimeInput,
		Field,
		Fieldset,
		Input,
		PageHeader,
		Textarea
	} from '@indy-center/centerline-svelte';
	import { signInHref } from '$lib/utils/signIn';
	import type { StaffingMessage } from './+page.server';

	const { data } = $props();

	// svelte-ignore state_referenced_locally
	const { form, errors, enhance, constraints, message, submitting } = superForm(data.form);
	const status = $derived($message as StaffingMessage | undefined);
	// The earliest start the picker offers
	const now = new Date().toISOString();
</script>

<svelte:head>
	<title>Request ATC Staffing | Indy Center</title>
</svelte:head>

<PageHeader title="Request ATC Staffing" class="mb-8">
	Running a fly-in, group flight or virtual airline event through Indy Center airspace? Tell our
	Events Team about it, at least two weeks ahead, and we'll do our best to have controllers on.
</PageHeader>

<Card class="mx-auto max-w-3xl">
	{#if !data.signedIn}
		<div class="flex flex-col items-center gap-4 py-4 text-center">
			<p>Connect your VATSIM account to request staffing.</p>
			<Button href={signInHref(page.url.pathname)}>Connect VATSIM account</Button>
		</div>
	{:else}
		<form method="POST" use:enhance class="flex flex-col gap-6">
			{#if status}
				<Alert
					level={status.type === 'success' ? 'success' : 'danger'}
					title={status.type === 'success' ? 'Request sent' : 'Not sent'}
				>
					{status.text}
				</Alert>
			{/if}

			<div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
				<Field label="Organization" error={$errors.organization?.[0]} required>
					{#snippet children(control)}
						<Input
							{...control}
							name="organization"
							bind:value={$form.organization}
							maxlength={$constraints.organization?.maxlength}
						/>
					{/snippet}
				</Field>
				<Field label="Event name" error={$errors.eventName?.[0]} required>
					{#snippet children(control)}
						<Input
							{...control}
							name="eventName"
							bind:value={$form.eventName}
							maxlength={$constraints.eventName?.maxlength}
						/>
					{/snippet}
				</Field>
			</div>

			<div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
				<Field label="Start" error={$errors.start?.[0]} required>
					{#snippet children(control)}
						<DateTimeInput {...control} name="start" bind:value={$form.start} min={now} />
					{/snippet}
				</Field>
				<Field label="End" error={$errors.end?.[0]} required>
					{#snippet children(control)}
						<DateTimeInput
							{...control}
							name="end"
							bind:value={$form.end}
							min={$form.start || now}
						/>
					{/snippet}
				</Field>
			</div>

			<div class="grid grid-cols-1 gap-6 sm:grid-cols-3">
				<Field
					label="Airports"
					hint="The fields your pilots fly in or out of, by ICAO code, such as KIND, KCVG."
					error={$errors.airports?.[0]}
					required
					class="sm:col-span-2"
				>
					{#snippet children(control)}
						<Input
							{...control}
							name="airports"
							bind:value={$form.airports}
							maxlength={$constraints.airports?.maxlength}
						/>
					{/snippet}
				</Field>
				<Field
					label="Expected pilots"
					hint="A rough count is fine."
					error={$errors.pilotCount?.[0]}
					required
				>
					{#snippet children(control)}
						<Input
							{...control}
							type="number"
							name="pilotCount"
							bind:value={$form.pilotCount}
							min="1"
							max="10000"
						/>
					{/snippet}
				</Field>
			</div>

			<Field
				label="Event page or Discord invite"
				hint="Where we can read more about the event, starting with https://."
				error={$errors.link?.[0]}
			>
				{#snippet children(control)}
					<Input
						{...control}
						type="url"
						name="link"
						bind:value={$form.link}
						maxlength={$constraints.link?.maxlength}
					/>
				{/snippet}
			</Field>

			<Fieldset
				legend="How can we reach you?"
				hint="Give an email, a Discord username, or both."
				error={$errors._errors?.[0]}
			>
				<div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
					<Field label="Email" error={$errors.email?.[0]}>
						{#snippet children(control)}
							<Input
								{...control}
								inputmode="email"
								name="email"
								bind:value={$form.email}
								autocomplete="email"
							/>
						{/snippet}
					</Field>
					<Field label="Discord username" error={$errors.discord?.[0]}>
						{#snippet children(control)}
							<Input
								{...control}
								name="discord"
								bind:value={$form.discord}
								maxlength={$constraints.discord?.maxlength}
							/>
						{/snippet}
					</Field>
				</div>
			</Fieldset>

			<Field
				label="About the event"
				hint="Routes, the flow you expect, which facilities you'd most like staffed, and anything else we should know."
				error={$errors.details?.[0]}
				required
			>
				{#snippet children(control)}
					<Textarea
						{...control}
						name="details"
						rows={6}
						bind:value={$form.details}
						maxlength={$constraints.details?.maxlength}
					/>
				{/snippet}
			</Field>

			<div>
				<Button type="submit" busy={$submitting} busyLabel="Sending">Send request</Button>
			</div>
		</form>
	{/if}
</Card>

<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import type { SuperValidated, Infer } from 'sveltekit-superforms';
	import {
		Alert,
		Button,
		DateTimeInput,
		Field,
		Input,
		Select,
		Textarea
	} from '@indy-center/centerline-svelte';
	import type { EventSchema } from '$lib/forms/events';
	import {
		EVENT_ROSTER_TYPES,
		EVENT_TYPES,
		getEventTypeConfig,
		isRosterTypeAllowed,
		LONG_EVENT_HOURS,
		longEventHours
	} from '$lib/config/events';

	const { data }: { data: SuperValidated<Infer<EventSchema>> } = $props();

	const { form, errors, enhance, constraints } = superForm(data);

	// DateTimeInput takes and sends UTC ISO strings; the form keeps Dates for the long-event check
	const toIso = (value: unknown) => {
		const date = value ? new Date(value as string | Date) : null;
		return date && !isNaN(date.getTime()) ? date.toISOString() : undefined;
	};
	let start = $state(toIso($form.startTime));
	let end = $state(toIso($form.endTime));
	$effect(() => {
		if (start) $form.startTime = new Date(start);
		if (end) $form.endTime = new Date(end);
	});

	// A warning, not an error: a long event is allowed, but often a mistyped date
	const longHours = $derived(longEventHours($form.startTime, $form.endTime));

	const eventTypeConfig = $derived.by(
		() =>
			getEventTypeConfig($form.type) ?? {
				allowedRosterTypes: EVENT_ROSTER_TYPES.map((type) => type.key)
			}
	);

	$effect(() => {
		if ($form.rosterType && !isRosterTypeAllowed($form.type, $form.rosterType)) {
			$form.rosterType = 'none';
		}
	});
</script>

<form method="POST" use:enhance class="flex flex-col gap-6">
	<Field label="Event name" error={$errors.name?.[0]} required>
		{#snippet children(control)}
			<Input {...control} name="name" bind:value={$form.name} {...$constraints.name} />
		{/snippet}
	</Field>

	<div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
		<Field label="Start" hint="In your time zone." error={$errors.startTime?.[0]} required>
			{#snippet children(control)}
				<DateTimeInput {...control} name="startTime" bind:value={start} />
			{/snippet}
		</Field>
		<Field label="End" hint="In your time zone." error={$errors.endTime?.[0]} required>
			{#snippet children(control)}
				<DateTimeInput {...control} name="endTime" bind:value={end} min={start} />
			{/snippet}
		</Field>
	</div>

	{#if longHours}
		<Alert level="caution" title="This event runs {longHours} hours">
			That's more than {LONG_EVENT_HOURS} hours. Check the start and end times before saving.
		</Alert>
	{/if}

	<div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
		<Field label="Event type" error={$errors.type?.[0]} required>
			{#snippet children(control)}
				<Select {...control} name="type" bind:value={$form.type}>
					{#each EVENT_TYPES as type (type.key)}
						<option value={type.key}>{type.label}</option>
					{/each}
				</Select>
			{/snippet}
		</Field>
		<Field label="Roster type" error={$errors.rosterType?.[0]} required>
			{#snippet children(control)}
				<Select {...control} name="rosterType" bind:value={$form.rosterType}>
					{#each eventTypeConfig?.allowedRosterTypes as rosterType (rosterType)}
						{@const rosterTypeConfig = EVENT_ROSTER_TYPES.find((type) => type.key === rosterType)}
						<option value={rosterTypeConfig?.key}>{rosterTypeConfig?.label}</option>
					{/each}
				</Select>
			{/snippet}
		</Field>
	</div>

	<Field label="Description" error={$errors.description?.[0]} required>
		{#snippet children(control)}
			<Textarea
				{...control}
				name="description"
				rows={6}
				bind:value={$form.description}
				{...$constraints.description}
			/>
		{/snippet}
	</Field>

	<Field
		label="Banner image address"
		hint="A link to the image, starting https://."
		error={$errors.bannerUrl?.[0]}
	>
		{#snippet children(control)}
			<Input {...control} type="url" name="bannerUrl" bind:value={$form.bannerUrl} />
		{/snippet}
	</Field>

	<div class="flex justify-end border-t border-border pt-6">
		<Button type="submit">Save event</Button>
	</div>
</form>

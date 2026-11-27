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

	// The times stay the UTC ISO strings DateTimeInput takes and sends, as the schema reads them
	// (its Date type is what they become on the server). Putting a Date in the form instead fails
	// Superforms' check against the data's types, as "Invalid input".
	const startTime = $derived(($form.startTime as unknown as string) || undefined);
	const endTime = $derived(($form.endTime as unknown as string) || undefined);
	const toDate = (value: string | undefined) => {
		const date = value ? new Date(value) : null;
		return date && !isNaN(date.getTime()) ? date : null;
	};

	// A warning, not an error: a long event is allowed, but often a mistyped date
	const longHours = $derived(longEventHours(toDate(startTime), toDate(endTime)));

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
		<Field label="Start" error={$errors.startTime?.[0]} required>
			{#snippet children(control)}
				<DateTimeInput
					{...control}
					name="startTime"
					bind:value={() => startTime, (value) => ($form.startTime = (value ?? '') as never)}
				/>
			{/snippet}
		</Field>
		<Field label="End" error={$errors.endTime?.[0]} required>
			{#snippet children(control)}
				<DateTimeInput
					{...control}
					name="endTime"
					min={startTime}
					bind:value={() => endTime, (value) => ($form.endTime = (value ?? '') as never)}
				/>
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

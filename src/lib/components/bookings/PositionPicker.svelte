<script lang="ts">
	import {
		POSITION_TYPES,
		POSITION_TYPE_LABELS,
		plainFacilityName,
		groupPositions,
		isListed,
		parseBookingTime,
		searchPositions,
		type BookablePosition,
		type PositionType
	} from '$lib/utils/bookings';
	import type { AtcBooking } from '$lib/types/bookings';
	import {
		Badge,
		Button,
		EmptyState,
		Position,
		SearchInput,
		Switch,
		Text,
		Time
	} from '@indy-center/centerline-svelte';

	type Props = {
		positions: BookablePosition[];
		value: string;
		error?: string | string[];
		// Positions already booked during the chosen times; shown greyed out and can't be picked
		booked?: Map<string, AtcBooking>;
		// Also list the non-primary positions. The page resets it each time the form opens.
		showAll?: boolean;
	};

	let {
		positions,
		value = $bindable(),
		error,
		booked = new Map(),
		showAll = $bindable(false)
	}: Props = $props();

	// Tower cab positions can be narrowed further within ATCT
	type AtctRole = 'TWR' | 'GND' | 'DEL' | 'RMP';
	const ATCT_ROLES: { role: AtctRole; label: string }[] = [
		{ role: 'TWR', label: 'Tower' },
		{ role: 'GND', label: 'Ground' },
		{ role: 'RMP', label: 'Ramp' },
		{ role: 'DEL', label: 'Clearance' }
	];
	const roleOf = (position: BookablePosition) => position.callsign.split('_').at(-1);

	const availableTypes = $derived(
		POSITION_TYPES.filter((type) => positions.some((position) => position.type === type))
	);
	// What the list offers right now; the rest sits behind the toggle
	const listed = $derived(positions.filter((position) => isListed(position, showAll)));
	const availableRoles = $derived(
		ATCT_ROLES.filter(({ role }) =>
			listed.some((position) => position.type === 'ATCT' && roleOf(position) === role)
		)
	);

	let selectedType: PositionType | undefined = $state();
	let atctRole: AtctRole | 'ALL' = $state('ALL');
	let query = $state('');

	const activeType = $derived(
		selectedType && availableTypes.includes(selectedType)
			? selectedType
			: (positions.find((position) => position.callsign === value)?.type ?? availableTypes[0])
	);

	const inActiveGroup = (position: BookablePosition) =>
		position.type === activeType &&
		(activeType !== 'ATCT' || atctRole === 'ALL' || roleOf(position) === atctRole);

	const matches = $derived(searchPositions(listed, query));
	const typeMatches = $derived(matches.filter(inActiveGroup));
	// Positions the search would find here if the toggle were on
	const hiddenCount = $derived(
		showAll
			? 0
			: searchPositions(positions, query).filter(
					(position) => inActiveGroup(position) && !isListed(position, false)
				).length
	);
	const otherMatches = $derived(
		query
			? availableTypes
					.filter((type) => type !== activeType)
					.map((type) => ({
						type,
						count: matches.filter((position) => position.type === type).length
					}))
					.filter(({ count }) => count > 0)
			: []
	);

	const groups = $derived(groupPositions(typeMatches));

	// Turning the toggle off drops a selected position that is no longer listed
	function setShowAll(next: boolean) {
		showAll = next;
		const selected = positions.find((position) => position.callsign === value);
		if (!next && selected && !isListed(selected, false)) value = '';
	}

	function selectType(type: PositionType) {
		if (type === activeType) return;
		selectedType = type;
		value = '';
	}
</script>

<!-- A button that reads as a link, for actions inside a sentence -->
{#snippet inlineAction(label: string, onclick: () => void)}
	<button
		type="button"
		class="cursor-pointer rounded text-link underline hover:no-underline focus-visible:outline-2 focus-visible:outline-ring"
		{onclick}>{label}</button
	>
{/snippet}

<div class="flex flex-col gap-3">
	<!-- Submitted even when search hides the selected radio -->
	<input type="hidden" name="callsign" {value} />

	<div>
		<span class="mb-2 block text-sm font-medium text-foreground" id="position-type-label">
			Position type
		</span>
		<div class="grid grid-cols-3 gap-2" role="group" aria-labelledby="position-type-label">
			{#each POSITION_TYPES as type (type)}
				{@const available = availableTypes.includes(type)}
				<Button
					variant="secondary"
					pressed={activeType === type}
					disabled={!available}
					onclick={() => selectType(type)}
					aria-describedby={available ? undefined : 'position-type-unavailable'}
				>
					{POSITION_TYPE_LABELS[type]}
				</Button>
			{/each}
		</div>
		{#if availableTypes.length < POSITION_TYPES.length}
			<Text size="small" id="position-type-unavailable" class="mt-1">
				Greyed-out types need a certification you don't hold yet.
			</Text>
		{/if}
	</div>

	<div>
		<SearchInput
			label="Position"
			bind:value={query}
			placeholder="Callsign or name, e.g. LOU, Louisville, tower"
			autocomplete="off"
			aria-invalid={error ? true : undefined}
			aria-describedby={error ? 'position-error' : undefined}
		/>
		{#if error}
			<p id="position-error" class="mt-1 text-sm text-destructive">{error}</p>
		{/if}

		<!-- Every Center sector is listed, so the toggle only matters for TRACON and ATCT -->
		{#if activeType !== 'ARTCC'}
			<Switch
				class="mt-2"
				label="Show all positions, not just the primary ones"
				bind:checked={() => showAll, (next) => setShowAll(next)}
			/>
		{/if}

		{#if activeType === 'ATCT' && availableRoles.length > 1}
			<div class="mt-2 flex flex-wrap gap-2" role="group" aria-label="Tower cab positions">
				<Button
					variant="secondary"
					size="sm"
					pressed={atctRole === 'ALL'}
					onclick={() => (atctRole = 'ALL')}
				>
					All
				</Button>
				{#each availableRoles as { role, label } (role)}
					<Button
						variant="secondary"
						size="sm"
						pressed={atctRole === role}
						onclick={() => (atctRole = role)}
					>
						{label}
					</Button>
				{/each}
			</div>
		{/if}

		<div
			class="mt-2 max-h-64 overflow-y-auto rounded-lg border border-border bg-card"
			role="radiogroup"
			aria-label="{activeType ? POSITION_TYPE_LABELS[activeType] : ''} positions"
		>
			{#each groups as group (group.label)}
				<div
					class="sticky top-0 z-10 bg-muted px-3 py-1.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase"
				>
					{plainFacilityName(group.label)}
				</div>
				{#each group.facilities as facility (facility.id)}
					<!-- A field under a parent facility gets its own line; a facility with no parent is its own heading -->
					{#if facility.label !== group.label}
						<div class="border-b border-border px-3 py-1 text-xs font-medium text-muted-foreground">
							{plainFacilityName(facility.label)}
						</div>
					{/if}
					{#each facility.positions as position (position.callsign)}
						{@const conflict = booked.get(position.callsign)}
						<label
							class="flex items-center gap-3 px-3 py-2 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-ring {conflict
								? 'cursor-not-allowed opacity-60'
								: value === position.callsign
									? 'cursor-pointer bg-primary/15'
									: 'cursor-pointer hover:bg-muted'}"
						>
							<input
								type="radio"
								name="callsign-choice"
								value={position.callsign}
								bind:group={value}
								disabled={!!conflict}
								class="size-4 shrink-0 accent-primary focus-visible:outline-none"
							/>
							<Position class="min-w-0" callsign={position.callsign} />

							{#if conflict}
								<Badge variant="gray" size="sm" pill class="ml-auto shrink-0">
									Booked <Time
										value={parseBookingTime(conflict.start)}
										end={parseBookingTime(conflict.end)}
									/>
								</Badge>
							{:else if position.primary && activeType === 'ARTCC'}
								<!-- TRACON and ATCT facilities are small enough that a badge would only add noise -->
								<Badge variant="sky" size="sm" pill class="ml-auto shrink-0">Primary</Badge>
							{/if}
						</label>
					{/each}
				{/each}
			{:else}
				<EmptyState size="inline" class="px-3 py-4">
					{#if query}
						No {activeType ? POSITION_TYPE_LABELS[activeType] : ''} positions match "{query}".
					{:else}
						No primary {activeType ? POSITION_TYPE_LABELS[activeType] : ''} positions here.
					{/if}
				</EmptyState>
			{/each}
		</div>

		{#if hiddenCount > 0}
			<Text size="small" class="mt-2">
				{hiddenCount} non-primary {hiddenCount === 1 ? 'position' : 'positions'} hidden.
				{@render inlineAction('Show all', () => setShowAll(true))}
			</Text>
		{/if}

		{#if otherMatches.length > 0}
			<Text size="small" class="mt-2">
				Also matching:
				{#each otherMatches as { type, count }, i (type)}
					{@render inlineAction(`${count} in ${POSITION_TYPE_LABELS[type]}`, () =>
						selectType(type)
					)}{i < otherMatches.length - 1 ? ', ' : ''}
				{/each}
			</Text>
		{/if}
	</div>
</div>

<script lang="ts">
	import { ADVANCED_FIELDS } from '$lib/config/bookings';
	import {
		POSITION_TYPES,
		formatZuluRange,
		getPositionLabel,
		searchPositions,
		type BookablePosition,
		type PositionType
	} from '$lib/utils/bookings';
	import type { AtcBooking } from '$lib/types/bookings';
	import IconMagnify from '~icons/mdi/magnify';

	type Props = {
		positions: BookablePosition[];
		value: string;
		error?: string | string[];
		// Positions already booked during the chosen times; shown greyed out and can't be picked
		booked?: Map<string, AtcBooking>;
	};

	let { positions, value = $bindable(), error, booked = new Map() }: Props = $props();

	// Tower cab positions can be narrowed further within ATCT
	type AtctRole = 'TWR' | 'GND' | 'DEL' | 'RMP';
	const ATCT_ROLES: { role: AtctRole; label: string }[] = [
		{ role: 'TWR', label: 'Tower' },
		{ role: 'GND', label: 'Ground' },
		{ role: 'DEL', label: 'Clearance' },
		{ role: 'RMP', label: 'Ramp' }
	];
	const roleOf = (position: BookablePosition) => position.callsign.split('_').at(-1);

	const availableTypes = $derived(
		POSITION_TYPES.filter((type) => positions.some((position) => position.type === type))
	);
	const availableRoles = $derived(
		ATCT_ROLES.filter(({ role }) =>
			positions.some((position) => position.type === 'ATCT' && roleOf(position) === role)
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

	const matches = $derived(searchPositions(positions, query));
	const typeMatches = $derived(
		matches.filter(
			(position) =>
				position.type === activeType &&
				(activeType !== 'ATCT' || atctRole === 'ALL' || roleOf(position) === atctRole)
		)
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

	// Only tower cab positions split by field; radar positions are one list each
	const groups = $derived.by(() => {
		if (activeType === 'ARTCC') return [{ label: 'Center', positions: typeMatches }];
		if (activeType === 'TRACON') return [{ label: 'Approach / Departure', positions: typeMatches }];

		return [
			{
				label: `Advanced (${ADVANCED_FIELDS.join(', ')})`,
				positions: typeMatches.filter((position) => position.advanced)
			},
			{ label: 'Simple', positions: typeMatches.filter((position) => !position.advanced) }
		].filter((group) => group.positions.length > 0);
	});

	function selectType(type: PositionType) {
		if (type === activeType) return;
		selectedType = type;
		value = '';
	}

	const chipClass = (active: boolean) =>
		`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
			active
				? 'border-sky-500 bg-sky-600/30 text-white'
				: 'border-slate-600 text-slate-300 hover:text-white'
		}`;
</script>

<div class="space-y-3">
	<!-- Submitted even when search hides the selected radio -->
	<input type="hidden" name="callsign" {value} />

	<div>
		<span class="mb-2 block text-sm font-medium text-gray-300">Position Type</span>
		<div class="grid grid-cols-3 gap-2" role="group" aria-label="Position type">
			{#each POSITION_TYPES as type (type)}
				{@const available = availableTypes.includes(type)}
				<button
					type="button"
					disabled={!available}
					aria-pressed={activeType === type}
					onclick={() => selectType(type)}
					title={available ? undefined : "You aren't certified for any positions of this type"}
					class="rounded-lg border px-3 py-2 text-sm font-medium transition-colors {activeType ===
					type
						? 'border-sky-500 bg-sky-600/30 text-white'
						: available
							? 'cursor-pointer border-slate-600 bg-slate-700 text-slate-300 hover:text-white'
							: 'cursor-not-allowed border-slate-700 bg-slate-800 text-slate-600'}"
				>
					{type}
				</button>
			{/each}
		</div>
	</div>

	<div>
		<label class="mb-2 block text-sm font-medium text-gray-300" for="position-search">
			Position
			{#if error}
				<span class="text-red-400">- {error}</span>
			{/if}
		</label>
		<div class="relative">
			<IconMagnify
				class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
			/>
			<input
				id="position-search"
				type="search"
				bind:value={query}
				placeholder="Search callsign or name, e.g. LOU, Louisville, tower"
				autocomplete="off"
				class="w-full rounded-lg border border-slate-600 bg-slate-700 py-2 pr-4 pl-9 text-white placeholder-gray-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500 focus:outline-none"
			/>
		</div>

		{#if activeType === 'ATCT' && availableRoles.length > 1}
			<div class="mt-2 flex flex-wrap gap-2" role="group" aria-label="ATCT position filter">
				<button
					type="button"
					aria-pressed={atctRole === 'ALL'}
					onclick={() => (atctRole = 'ALL')}
					class={chipClass(atctRole === 'ALL')}
				>
					All
				</button>
				{#each availableRoles as { role, label } (role)}
					<button
						type="button"
						aria-pressed={atctRole === role}
						onclick={() => (atctRole = role)}
						class={chipClass(atctRole === role)}
					>
						{label}
					</button>
				{/each}
			</div>
		{/if}

		<div
			class="mt-2 max-h-64 overflow-y-auto rounded-lg border border-slate-600 bg-slate-900/40"
			role="radiogroup"
			aria-label="{activeType} positions"
		>
			{#each groups as group (group.label)}
				<div
					class="sticky top-0 bg-slate-800 px-3 py-1.5 text-xs font-semibold tracking-wider text-slate-400 uppercase"
				>
					{group.label}
				</div>
				{#each group.positions as position (position.callsign)}
					{@const label = getPositionLabel(position)}
					{@const conflict = booked.get(position.callsign)}
					<label
						class="flex items-center gap-3 px-3 py-2 text-sm transition-colors {conflict
							? 'cursor-not-allowed text-slate-500'
							: value === position.callsign
								? 'cursor-pointer bg-sky-600/30 text-white'
								: 'cursor-pointer text-slate-300 hover:bg-slate-700/60'}"
					>
						<input
							type="radio"
							name="callsign-choice"
							value={position.callsign}
							bind:group={value}
							disabled={!!conflict}
							class="h-4 w-4 border-slate-500 bg-slate-700 text-sky-500 focus:ring-sky-500 disabled:opacity-40"
						/>
						<span class="shrink-0 font-semibold" title={position.callsign}>{label.title}</span>
						{#if label.detail}
							<span class="truncate {conflict ? '' : 'text-slate-400'}">{label.detail}</span>
						{/if}
						{#if conflict}
							<span
								class="ml-auto shrink-0 rounded-full border border-slate-600 px-2 py-0.5 text-xs font-medium text-slate-400"
							>
								Booked {formatZuluRange(conflict)}
							</span>
						{:else if position.primary && activeType === 'ARTCC'}
							<!-- TRACON and ATCT only list primary positions, so the badge only tells centers apart -->
							<span
								class="ml-auto shrink-0 rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-xs font-medium text-sky-300"
							>
								Primary
							</span>
						{/if}
					</label>
				{/each}
			{:else}
				<p class="px-3 py-4 text-sm text-slate-400">No {activeType} positions match "{query}".</p>
			{/each}
		</div>

		{#if otherMatches.length > 0}
			<p class="mt-2 text-xs text-slate-400">
				Also matching:
				{#each otherMatches as { type, count }, i (type)}
					<button
						type="button"
						class="cursor-pointer text-sky-400 hover:underline"
						onclick={() => selectType(type)}>{count} in {type}</button
					>{i < otherMatches.length - 1 ? ', ' : ''}
				{/each}
			</p>
		{/if}
	</div>
</div>

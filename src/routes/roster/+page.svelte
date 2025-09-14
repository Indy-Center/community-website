<script lang="ts">
	import { parseISO, formatDistanceToNow } from 'date-fns';
	import IconArrowUp from '~icons/mdi/arrow-up';
	import IconArrowDown from '~icons/mdi/arrow-down';
	import IconTransmissionTower from '~icons/mdi/transmission-tower';
	import Tooltip from '$lib/components/Tooltip.svelte';
	import type { VnasController } from '$lib/types/vnas.js';

	let { data } = $props();

	// Certification name mappings
	const certificationNames: Record<string, string> = {
		DEL: 'Clearance Delivery Certified',
		'S-GND': 'Simple Ground Certified',
		GND: 'Ground Certified',
		'S-TWR': 'Simple Tower Certified',
		TWR: 'Tower Certified',
		APR: 'Approach Certified',
		CTR: 'Center Certified'
	};

	const { roster, controllers } = data;

	let searchTerm = $state('');
	let sortField = $state<string>('initials');
	let sortDirection = $state<'asc' | 'desc'>('asc');
	let showOnlineOnly = $state(false);

	const SORT_OPTIONS = [
		{
			key: 'initials',
			label: 'Initials'
		},
		{
			key: 'name',
			label: 'Name'
		},
		{
			key: 'rating',
			label: 'Rating'
		},
		{
			key: 'certification',
			label: 'Certification'
		},
		{
			key: 'joined',
			label: 'Joined'
		}
	];

	function getHighestCertification(certifications: { certification: string }[]) {
		if (!certifications || certifications.length === 0) return null;

		const certOrder = ['GND', 'S-TWR', 'TWR', 'APR', 'CTR'];
		let highest = null;
		let highestIndex = -1;

		for (const cert of certifications) {
			const index = certOrder.indexOf(cert.certification);
			if (index > highestIndex) {
				highestIndex = index;
				highest = cert;
			}
		}

		return highest;
	}

	function getRatingOrder(rating: string): number {
		const ratingOrder = ['OBS', 'S1', 'S2', 'S3', 'C1', 'C3', 'I1', 'I3', 'SUP'];
		const index = ratingOrder.indexOf(rating);
		return index === -1 ? 999 : index;
	}

	function getCertificationOrder(certification: string | null): number {
		if (!certification) return -1;
		const certOrder = ['GND', 'S-TWR', 'TWR', 'APR', 'CTR'];
		const index = certOrder.indexOf(certification);
		return index === -1 ? 999 : index;
	}

	function handleSort(field: string) {
		if (sortField === field) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortField = field;
			sortDirection = 'asc';
		}
	}

	function formatSince(dateString: string): string {
		const date = parseISO(dateString);
		return formatDistanceToNow(date, { addSuffix: false });
	}

	function formatFrequency(frequency: number): string {
		// Convert frequency from format like 132300000 to 132.300
		return (frequency / 1000000).toFixed(3);
	}

	function getOnlineStatus(cid: string) {
		const onlineController: VnasController | undefined = controllers.find(
			(controller) => controller.vatsimData.cid.toString() === cid.toString()
		);

		if (onlineController) {
			const primaryPosition = onlineController.positions?.find((pos) => pos.isPrimary);
			return {
				isOnline: true,
				callsign: primaryPosition?.defaultCallsign || onlineController.primaryPositionId,
				frequency: primaryPosition?.frequency,
				loginTime: parseISO(onlineController.loginTime)
			};
		}

		return { isOnline: false, callsign: null, frequency: null, loginTime: null };
	}

	let filteredAndSortedRoster = $derived(
		(() => {
			if (!data.roster || !Array.isArray(data.roster)) {
				return [];
			}

			// Filter first
			const filtered = data.roster.filter((member) => {
				const displayName = member.user?.preferredName
					? member.user.preferredName.toLowerCase()
					: `${member.data.fname} ${member.data.lname}`.toLowerCase();

				const matchesSearch =
					searchTerm === '' ||
					displayName.includes(searchTerm.toLowerCase()) ||
					member.data.cid.toString().includes(searchTerm);

				const onlineStatus = getOnlineStatus(member.data.cid.toString());
				const matchesOnlineFilter = !showOnlineOnly || onlineStatus.isOnline;

				return matchesSearch && matchesOnlineFilter;
			});

			// Then sort
			return filtered.sort((a, b) => {
				let aVal: any, bVal: any;

				switch (sortField) {
					case 'name':
						aVal = a.user?.preferredName
							? a.user.preferredName.toLowerCase()
							: a.data.fname.toLowerCase();
						bVal = b.user?.preferredName
							? b.user.preferredName.toLowerCase()
							: b.data.fname.toLowerCase();
						break;
					case 'rating':
						aVal = getRatingOrder(a.data.rating_short);
						bVal = getRatingOrder(b.data.rating_short);
						break;
					case 'certification':
						const aHighest = getHighestCertification(a.user?.certifications || []);
						const bHighest = getHighestCertification(b.user?.certifications || []);
						aVal = getCertificationOrder(aHighest?.certification || null);
						bVal = getCertificationOrder(bHighest?.certification || null);
						break;
					case 'initials':
						aVal = (a.user?.operatingInitials || 'ZZZ').toLowerCase();
						bVal = (b.user?.operatingInitials || 'ZZZ').toLowerCase();
						break;
					case 'joined':
						aVal = new Date(a.data.facility_join);
						bVal = new Date(b.data.facility_join);
						break;
					default:
						return 0;
				}

				if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
				if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
				return 0;
			});
		})()
	);
</script>

<svelte:head>
	<title>Indy Center | Roster</title>
</svelte:head>

<div class="mb-8">
	<h1 class="text-3xl font-bold text-white">Controller Roster</h1>
	<p class="mt-2 text-gray-400">The active home and visiting controllers of Indy Center.</p>
</div>

<!-- Search, Filter and Sorting Controls -->
<div class="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
	<!-- Search and Online Filter -->
	<div class="flex items-center gap-2">
		<label for="search-input" class="sr-only">Search members by name or CID</label>
		<input
			id="search-input"
			type="text"
			bind:value={searchTerm}
			placeholder="Search by name or CID..."
			class="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-3 text-sm text-white placeholder-gray-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500 focus:outline-none md:w-64 md:py-2"
		/>
		{#if searchTerm}
			<button
				type="button"
				onclick={() => (searchTerm = '')}
				class="rounded-lg border border-slate-600 bg-slate-700 px-3 py-3 text-sm text-white hover:bg-slate-600 focus:border-sky-500 focus:ring-2 focus:ring-sky-500 focus:outline-none md:py-2"
			>
				Clear
			</button>
		{/if}
		<button
			type="button"
			onclick={() => (showOnlineOnly = !showOnlineOnly)}
			class="flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-sky-500 md:py-2 {showOnlineOnly
				? 'border-green-500 bg-green-600 text-white'
				: 'border-slate-600 bg-slate-700 text-white hover:bg-slate-600'}"
		>
			<IconTransmissionTower class="h-4 w-4" />
			{showOnlineOnly ? 'Online Only' : 'All'}
		</button>
	</div>

	<!-- Sort Controls -->
	<div class="w-full md:w-auto">
		<div class="grid grid-cols-2 gap-2 md:flex md:flex-wrap md:items-center md:gap-2">
			{#each SORT_OPTIONS as option}
				<button
					onclick={() => handleSort(option.key)}
					class="flex cursor-pointer items-center justify-center gap-1 rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-xs font-medium text-white transition-all hover:bg-slate-600 md:justify-start md:py-1 {sortField ===
					option.key
						? 'border-sky-500 bg-sky-600'
						: ''}"
				>
					{option.label}
					{#if sortField === option.key}
						{#if sortDirection === 'asc'}
							<IconArrowUp class="h-3 w-3" />
						{:else}
							<IconArrowDown class="h-3 w-3" />
						{/if}
					{/if}
				</button>
			{/each}
		</div>
	</div>
</div>

<!-- Sleek Card Rows -->
<div class="space-y-2">
	{#each filteredAndSortedRoster as member}
		{@const onlineStatus = getOnlineStatus(member.data.cid.toString())}
		<div
			class="group relative rounded-lg bg-slate-800/80 shadow-sm backdrop-blur-sm transition-all hover:bg-slate-700/80 hover:shadow-md {onlineStatus.isOnline
				? 'bg-green-950/20 ring-1 ring-green-500/30'
				: ''} min-h-[70px] md:h-[70px]"
		>
			<div
				class="flex h-full flex-col px-4 py-3 md:flex-row md:items-center md:justify-between md:py-0"
			>
				<!-- Left Side: Name + All Badges -->
				<div class="flex min-w-0 flex-1 flex-wrap items-center gap-2">
					<!-- OI Space (always reserved) -->
					<div class="flex w-10 flex-shrink-0 justify-start">
						{#if member.user?.operatingInitials}
							<Tooltip text="Operating Initials">
								<div
									class="items-center justify-center rounded bg-indigo-600/80 px-2 py-1 font-mono text-xs font-semibold text-white"
								>
									{member.user.operatingInitials}
								</div>
							</Tooltip>
						{/if}
					</div>

					<!-- Name + Badges Container -->
					<div class="flex min-w-0 flex-wrap items-center justify-center gap-2">
						<!-- Name -->
						<div class="min-w-0 font-semibold text-white">
							<span class="block md:inline">
								{member.user?.preferredName
									? member.user.preferredName
									: `${member.data.fname} ${member.data.flag_nameprivacy ? member.data.cid : member.data.lname}`}
							</span>
							<span class="ml-1 text-sm font-normal text-gray-400">({member.data.cid})</span>
						</div>

						<!-- Rating -->
						<Tooltip text="VATSIM Rating">
							<div
								class="items-center justify-center rounded-full bg-sky-600/90 px-2 py-1 text-xs font-semibold text-white"
							>
								{member.data.rating_short}
							</div>
						</Tooltip>

						<!-- Certifications -->
						{#if member.user?.certifications && member.user.certifications.length > 0}
							{#each member.user.certifications as cert}
								<Tooltip
									text={certificationNames[cert.certification] || `${cert.certification} Certified`}
								>
									<div
										class="items-center justify-center rounded bg-emerald-600/80 px-2 py-1 text-xs font-semibold text-white"
									>
										{cert.certification}
									</div>
								</Tooltip>
							{/each}
						{/if}

						<!-- Endorsements -->
						{#if member.user?.endorsements && member.user.endorsements.length > 0}
							{#each member.user.endorsements as endorsement}
								<Tooltip text="Tier 2 Center Endorsement">
									<div
										class="items-center justify-center rounded bg-purple-600/80 px-2 py-1 text-xs font-semibold text-white"
									>
										{endorsement.endorsement}
									</div>
								</Tooltip>
							{/each}
						{/if}

						<!-- Online Status -->
						{#if onlineStatus.isOnline}
							<div class="flex items-center justify-center gap-1 rounded bg-green-600/20 px-2 py-1">
								<IconTransmissionTower class="h-3 w-3 text-green-400" />
								<div class="font-mono text-xs font-medium text-green-400">
									{onlineStatus.callsign} • {onlineStatus.frequency
										? formatFrequency(onlineStatus.frequency)
										: 'N/A'}
								</div>
							</div>
						{/if}
					</div>
				</div>

				<!-- Right Side: Join Date Only -->
				<div
					class="mt-2 flex-shrink-0 text-left text-right text-xs text-gray-400 md:mt-0 md:ml-4 md:text-right"
				>
					{formatSince(member.data.facility_join)}
				</div>
			</div>
		</div>
	{:else}
		<div class="rounded-lg bg-slate-800/80 p-8 text-center text-gray-400">
			No controllers found matching your search.
		</div>
	{/each}
</div>

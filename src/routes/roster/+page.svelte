<script lang="ts">
	import { parseISO, formatDistanceToNow } from 'date-fns';
	import IconArrowUp from '~icons/mdi/arrow-up';
	import IconArrowDown from '~icons/mdi/arrow-down';
	import IconTransmissionTower from '~icons/mdi/transmission-tower';
	import Tooltip from '$lib/components/Tooltip.svelte';

	let { data } = $props();

	// Certification name mappings
	const certificationNames: Record<string, string> = {
		'GND': 'Ground Certified',
		'S-TWR': 'Simple Tower Certified', 
		'TWR': 'Tower Certified',
		'APR': 'Approach Certified',
		'CTR': 'Center Certified'
	};

	const { roster, controllers } = data;

	let searchTerm = $state('');
	let sortField = $state<string>('name');
	let sortDirection = $state<'asc' | 'desc'>('asc');

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

	function getOnlineStatus(cid: string) {
		const onlineController = controllers.find(controller => controller.vatsimData.cid.toString() === cid.toString());
		
		if (onlineController) {
			const primaryPosition = onlineController.positions?.find(pos => pos.isPrimary);
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

				return matchesSearch;
			});

			// Then sort
			return filtered.sort((a, b) => {
				let aVal: any, bVal: any;

				switch (sortField) {
					case 'name':
						aVal = a.user?.preferredName 
							? a.user.preferredName.toLowerCase()
							: a.data.lname.toLowerCase();
						bVal = b.user?.preferredName 
							? b.user.preferredName.toLowerCase()
							: b.data.lname.toLowerCase();
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
					case 'online':
						const aOnline = getOnlineStatus(a.data.cid);
						const bOnline = getOnlineStatus(b.data.cid);
						aVal = aOnline.isOnline ? 1 : 0;
						bVal = bOnline.isOnline ? 1 : 0;
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


<!-- Search and Sorting Controls -->
<div class="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
	<!-- Search -->
	<div class="flex items-center gap-2">
		<label for="search-input" class="sr-only">Search members by name or CID</label>
		<input
			id="search-input"
			type="text"
			bind:value={searchTerm}
			placeholder="Search by name or CID..."
			class="w-full md:w-64 rounded-lg border border-slate-600 bg-slate-700 px-4 py-3 md:py-2 text-sm text-white placeholder-gray-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500 focus:outline-none"
		/>
		{#if searchTerm}
			<button
				type="button"
				onclick={() => (searchTerm = '')}
				class="rounded-lg border border-slate-600 bg-slate-700 px-3 py-3 md:py-2 text-sm text-white hover:bg-slate-600 focus:border-sky-500 focus:ring-2 focus:ring-sky-500 focus:outline-none"
			>
				Clear
			</button>
		{/if}
	</div>

	<!-- Sort Controls -->
	<div class="w-full md:w-auto">
		<div class="grid grid-cols-2 gap-2 md:flex md:flex-wrap md:items-center md:gap-2">
			<button
				onclick={() => handleSort('name')}
				class="flex items-center justify-center md:justify-start gap-1 rounded-md border border-slate-600 bg-slate-700 px-3 py-2 md:py-1 text-xs font-medium text-white transition-all hover:bg-slate-600 cursor-pointer {sortField === 'name' ? 'bg-sky-600 border-sky-500' : ''}"
			>
				Name
				{#if sortField === 'name'}
					{#if sortDirection === 'asc'}
						<IconArrowUp class="h-3 w-3" />
					{:else}
						<IconArrowDown class="h-3 w-3" />
					{/if}
				{/if}
			</button>
			<button
				onclick={() => handleSort('rating')}
				class="flex items-center justify-center md:justify-start gap-1 rounded-md border border-slate-600 bg-slate-700 px-3 py-2 md:py-1 text-xs font-medium text-white transition-all hover:bg-slate-600 cursor-pointer {sortField === 'rating' ? 'bg-sky-600 border-sky-500' : ''}"
			>
				Rating
				{#if sortField === 'rating'}
					{#if sortDirection === 'asc'}
						<IconArrowUp class="h-3 w-3" />
					{:else}
						<IconArrowDown class="h-3 w-3" />
					{/if}
				{/if}
			</button>
			<button
				onclick={() => handleSort('certification')}
				class="flex items-center justify-center md:justify-start gap-1 rounded-md border border-slate-600 bg-slate-700 px-3 py-2 md:py-1 text-xs font-medium text-white transition-all hover:bg-slate-600 cursor-pointer {sortField === 'certification' ? 'bg-sky-600 border-sky-500' : ''}"
			>
				Certification
				{#if sortField === 'certification'}
					{#if sortDirection === 'asc'}
						<IconArrowUp class="h-3 w-3" />
					{:else}
						<IconArrowDown class="h-3 w-3" />
					{/if}
				{/if}
			</button>
			<button
				onclick={() => handleSort('initials')}
				class="flex items-center justify-center md:justify-start gap-1 rounded-md border border-slate-600 bg-slate-700 px-3 py-2 md:py-1 text-xs font-medium text-white transition-all hover:bg-slate-600 cursor-pointer {sortField === 'initials' ? 'bg-sky-600 border-sky-500' : ''}"
			>
				Initials
				{#if sortField === 'initials'}
					{#if sortDirection === 'asc'}
						<IconArrowUp class="h-3 w-3" />
					{:else}
						<IconArrowDown class="h-3 w-3" />
					{/if}
				{/if}
			</button>
			<button
				onclick={() => handleSort('online')}
				class="flex items-center justify-center md:justify-start gap-1 rounded-md border border-slate-600 bg-slate-700 px-3 py-2 md:py-1 text-xs font-medium text-white transition-all hover:bg-slate-600 cursor-pointer {sortField === 'online' ? 'bg-green-600 border-green-500' : ''}"
			>
				Online
				{#if sortField === 'online'}
					{#if sortDirection === 'asc'}
						<IconArrowUp class="h-3 w-3" />
					{:else}
						<IconArrowDown class="h-3 w-3" />
					{/if}
				{/if}
			</button>
			<button
				onclick={() => handleSort('joined')}
				class="flex items-center justify-center md:justify-start gap-1 rounded-md border border-slate-600 bg-slate-700 px-3 py-2 md:py-1 text-xs font-medium text-white transition-all hover:bg-slate-600 cursor-pointer {sortField === 'joined' ? 'bg-sky-600 border-sky-500' : ''}"
			>
				Joined
				{#if sortField === 'joined'}
					{#if sortDirection === 'asc'}
						<IconArrowUp class="h-3 w-3" />
					{:else}
						<IconArrowDown class="h-3 w-3" />
					{/if}
				{/if}
			</button>
		</div>
	</div>
</div>

<!-- Sleek Card Rows -->
<div class="space-y-2">
	{#each filteredAndSortedRoster as member}
		{@const onlineStatus = getOnlineStatus(member.data.cid)}
		<div class="group relative rounded-lg bg-slate-800/80 shadow-sm backdrop-blur-sm transition-all hover:bg-slate-700/80 hover:shadow-md {onlineStatus.isOnline ? 'ring-1 ring-green-500/30 bg-green-950/20' : ''} md:h-[70px] min-h-[70px]">
			<div class="flex flex-col md:flex-row md:items-center md:justify-between h-full px-4 py-3 md:py-0">
				<!-- Left Side: Name + All Badges -->
				<div class="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
					<!-- OI Space (always reserved) -->
					<div class="w-10 flex justify-start flex-shrink-0">
						{#if member.user?.operatingInitials}
							<Tooltip text="Operating Initials">
								<span class="inline-flex items-center rounded bg-indigo-600/80 px-2 py-1 text-xs font-mono font-semibold text-white">
									{member.user.operatingInitials}
								</span>
							</Tooltip>
						{/if}
					</div>

					<!-- Name + Badges Container -->
					<div class="flex items-center gap-2 min-w-0 flex-wrap">
						<!-- Name -->
						<div class="font-semibold text-white min-w-0">
							<span class="block md:inline">
								{member.user?.preferredName ? member.user.preferredName : `${member.data.fname} ${member.data.flag_nameprivacy ? member.data.cid : member.data.lname}`}
							</span>
							<span class="font-normal text-gray-400 text-sm ml-1">({member.data.cid})</span>
						</div>

						<!-- Rating -->
						<Tooltip text="VATSIM Rating">
							<span class="inline-flex items-center justify-center rounded-full bg-sky-600/90 px-2 py-1 text-xs font-semibold text-white flex-shrink-0">
								{member.data.rating_short}
							</span>
						</Tooltip>

						<!-- Certifications -->
						{#if member.user?.certifications}
							{@const highestCert = getHighestCertification(member.user.certifications)}
							{#if highestCert}
								<span class="inline-flex items-center justify-center rounded bg-emerald-600/80 px-2 py-1 text-xs font-semibold text-white flex-shrink-0">
									{highestCert.certification}
								</span>
							{/if}
						{/if}

						<!-- Online Status -->
						{#if onlineStatus.isOnline}
							<div class="inline-flex items-center gap-1 rounded bg-green-600/20 px-2 py-1 flex-shrink-0">
								<IconTransmissionTower class="h-3 w-3 text-green-400" />
								<div class="text-xs text-green-400 font-medium font-mono">
									{onlineStatus.callsign} • {onlineStatus.frequency?.toFixed(2)}
								</div>
							</div>
						{/if}
					</div>
				</div>

				<!-- Right Side: Join Date Only -->
				<div class="text-right md:text-right text-left mt-2 md:mt-0 text-xs text-gray-400 flex-shrink-0 md:ml-4">
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
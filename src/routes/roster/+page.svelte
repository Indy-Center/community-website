<script lang="ts">
	import { parseISO, formatDistanceToNow } from 'date-fns';
	import IconArrowUp from '~icons/mdi/arrow-up';
	import IconArrowDown from '~icons/mdi/arrow-down';
	import IconTransmissionTower from '~icons/mdi/transmission-tower';

	let { data } = $props();

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
<div class="mb-4 flex flex-col sm:flex-row sm:items-center gap-4">
	<!-- Search -->
	<div class="flex items-center gap-2">
		<label for="search-input" class="sr-only">Search members by name or CID</label>
		<input
			id="search-input"
			type="text"
			bind:value={searchTerm}
			placeholder="Search by name or CID..."
			class="rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-sm text-white placeholder-gray-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500 focus:outline-none"
		/>
		{#if searchTerm}
			<button
				type="button"
				onclick={() => (searchTerm = '')}
				class="rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white hover:bg-slate-600 focus:border-sky-500 focus:ring-2 focus:ring-sky-500 focus:outline-none"
			>
				Clear
			</button>
		{/if}
	</div>

	<!-- Sort Controls -->
	<div class="flex flex-wrap items-center gap-2">
		<span class="text-sm text-gray-400">Sort by:</span>
	<button
		onclick={() => handleSort('name')}
		class="flex items-center gap-1 rounded-md border border-slate-600 bg-slate-700 px-3 py-1 text-xs font-medium text-white transition-all hover:bg-slate-600 {sortField === 'name' ? 'bg-sky-600 border-sky-500' : ''}"
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
		class="flex items-center gap-1 rounded-md border border-slate-600 bg-slate-700 px-3 py-1 text-xs font-medium text-white transition-all hover:bg-slate-600 {sortField === 'rating' ? 'bg-sky-600 border-sky-500' : ''}"
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
		class="flex items-center gap-1 rounded-md border border-slate-600 bg-slate-700 px-3 py-1 text-xs font-medium text-white transition-all hover:bg-slate-600 {sortField === 'certification' ? 'bg-sky-600 border-sky-500' : ''}"
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
		class="flex items-center gap-1 rounded-md border border-slate-600 bg-slate-700 px-3 py-1 text-xs font-medium text-white transition-all hover:bg-slate-600 {sortField === 'initials' ? 'bg-sky-600 border-sky-500' : ''}"
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
		class="flex items-center gap-1 rounded-md border border-slate-600 bg-slate-700 px-3 py-1 text-xs font-medium text-white transition-all hover:bg-slate-600 {sortField === 'online' ? 'bg-green-600 border-green-500' : ''}"
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
		class="flex items-center gap-1 rounded-md border border-slate-600 bg-slate-700 px-3 py-1 text-xs font-medium text-white transition-all hover:bg-slate-600 {sortField === 'joined' ? 'bg-sky-600 border-sky-500' : ''}"
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

<!-- Sleek Card Rows -->
<div class="space-y-2">
	{#each filteredAndSortedRoster as member}
		{@const onlineStatus = getOnlineStatus(member.data.cid)}
		<div class="group relative rounded-lg bg-slate-800/80 shadow-sm backdrop-blur-sm transition-all hover:bg-slate-700/80 hover:shadow-md {onlineStatus.isOnline ? 'ring-1 ring-green-500/30 bg-green-950/20' : ''} h-[70px]">
			<div class="flex items-center h-full px-4 gap-3">
				<!-- Name (fixed width) -->
				<div class="w-44 font-semibold text-white truncate">
					{member.user?.preferredName ? member.user.preferredName : `${member.data.fname} ${member.data.flag_nameprivacy ? member.data.cid : member.data.lname}`}
				</div>
				
				<!-- CID -->
				<span class="w-16 text-xs text-gray-400 flex-shrink-0">#{member.data.cid}</span>
				
				<!-- Rating -->
				<span class="inline-flex rounded-full bg-sky-600/90 px-2 py-1 text-xs font-semibold text-white flex-shrink-0">
					{member.data.rating_short}
				</span>

				<!-- Certification -->
				<div class="w-12">
					{#if member.user?.certifications}
						{@const highestCert = getHighestCertification(member.user.certifications)}
						{#if highestCert}
							<span class="inline-flex rounded bg-emerald-600/80 px-2 py-1 text-xs font-medium text-white">
								{highestCert.certification}
							</span>
						{/if}
					{/if}
				</div>

				<!-- Operating Initials -->
				<div class="w-12">
					{#if member.user?.operatingInitials}
						<span class="inline-flex rounded bg-indigo-600/80 px-2 py-1 text-xs font-mono font-medium text-white">
							{member.user.operatingInitials}
						</span>
					{/if}
				</div>

				<!-- Online Status -->
				<div class="flex-1 min-w-0">
					{#if onlineStatus.isOnline}
						<div class="inline-flex items-center gap-2 rounded bg-green-600/20 px-3 py-1">
							<IconTransmissionTower class="h-3 w-3 text-green-400 flex-shrink-0" />
							<div class="text-xs text-green-400 font-medium min-w-0">
								<div class="font-mono text-xs">{onlineStatus.callsign} • {onlineStatus.frequency?.toFixed(2)}</div>
							</div>
						</div>
					{/if}
				</div>

				<!-- Roles -->
				<div class="flex gap-1 flex-shrink-0">
					{#each member.data.roles.filter((role) => role.facility === 'ZID').slice(0, 2) as role}
						<span class="inline-flex rounded bg-slate-600/60 px-2 py-1 text-xs text-gray-300">
							{role.role}
						</span>
					{/each}
				</div>

				<!-- Join date -->
				<div class="w-20 text-right text-xs text-gray-400 flex-shrink-0">
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
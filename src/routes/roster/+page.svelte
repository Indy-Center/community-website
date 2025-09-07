<script lang="ts">
	import IconArrowUp from '~icons/mdi/arrow-up';
	import IconArrowDown from '~icons/mdi/arrow-down';
	import IconUnfoldMoreHorizontal from '~icons/mdi/unfold-more-horizontal';
	import IconChevronDown from '~icons/mdi/chevron-down';
	import PageHero from '$lib/components/PageHero.svelte';
	import { parseISO } from 'date-fns';

	let { data } = $props();

	const { roster } = data;

	let searchTerm = $state('');
	let selectedRating = $state('all');
	let selectedMembership = $state('all');
	let sortField = $state<string>('last_name');
	let sortDirection = $state<'asc' | 'desc'>('asc');

	function formatMembership(membership: string): string {
		return membership === 'home' ? 'Home' : membership === 'visit' ? 'Visitor' : membership;
	}

	function handleSort(field: string) {
		if (sortField === field) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortField = field;
			sortDirection = 'asc';
		}
	}

	function getRatingOrder(rating: string): number {
		const ratingOrder = ['OBS', 'S1', 'S2', 'S3', 'C1', 'C3', 'I1', 'I3', 'SUP'];
		const index = ratingOrder.indexOf(rating);
		return index === -1 ? 999 : index;
	}

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

	function getCertificationOrder(certification: string | null): number {
		if (!certification) return -1;
		const certOrder = ['GND', 'S-TWR', 'TWR', 'APR', 'CTR'];
		const index = certOrder.indexOf(certification);
		return index === -1 ? 999 : index;
	}

	let uniqueRatings = $derived(
		[...new Set(roster.map((member) => member.controller.rating_short))].sort()
	);

	let filteredAndSortedRoster = $derived(
		(() => {
			// Filter first
			const filtered = data.roster.filter((member) => {
				const matchesSearch =
					searchTerm === '' ||
					member.controller.fname.toLowerCase().includes(searchTerm.toLowerCase()) ||
					member.controller.lname.toLowerCase().includes(searchTerm.toLowerCase()) ||
					member.controller.cid.toString().includes(searchTerm);

				const matchesRating =
					selectedRating === 'all' || member.controller.rating_short === selectedRating;
				// Remove membership filter since we removed that field
				const matchesMembership = true;

				return matchesSearch && matchesRating && matchesMembership;
			});

			// Then sort
			return filtered.sort((a, b) => {
				let aVal: any, bVal: any;

				switch (sortField) {
					case 'cid':
						aVal = a.controller.cid;
						bVal = b.controller.cid;
						break;
					case 'last_name':
						aVal = a.controller.lname.toLowerCase();
						bVal = b.controller.lname.toLowerCase();
						break;
					case 'rating_short':
						aVal = getRatingOrder(a.controller.rating_short);
						bVal = getRatingOrder(b.controller.rating_short);
						break;
					case 'certification':
						const aHighest = getHighestCertification(a.certifications || []);
						const bHighest = getHighestCertification(b.certifications || []);
						aVal = getCertificationOrder(aHighest?.certification || null);
						bVal = getCertificationOrder(bHighest?.certification || null);
						break;
					case 'facility_joined_at':
						aVal = new Date(a.controller.facility_join);
						bVal = new Date(b.controller.facility_join);
						break;
					case 'last_activity_at':
						aVal = new Date(a.controller.lastactivity);
						bVal = new Date(b.controller.lastactivity);
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

<div class="flex w-full flex-col justify-center gap-2">
	<PageHero size="compact">
		<h1 class="mb-1 text-xl font-bold text-white sm:text-lg md:text-lg lg:text-xl">
			Controller Roster
		</h1>
		<p class="mx-auto mb-1 max-w-2xl text-xs leading-tight text-gray-300 sm:text-xs lg:text-sm">
			The active home and visiting controllers of Indy Center.
		</p>
	</PageHero>
	<!-- Roster Section -->
	<div class="w-full bg-gray-900">
		<div class="mx-auto max-w-6xl px-4 py-8">
			<!-- Search and Filter Controls -->
			<div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div class="flex max-w-md flex-1">
					<label for="search-input" class="sr-only">Search members by name or CID</label>
					<input
						id="search-input"
						type="text"
						bind:value={searchTerm}
						placeholder="Search by name or CID..."
						class="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-white placeholder-gray-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500 focus:outline-none"
					/>
				</div>
				<div class="flex gap-3">
					<div class="relative">
						<label for="rating-filter" class="sr-only">Filter by rating</label>
						<select
							id="rating-filter"
							bind:value={selectedRating}
							class="w-full cursor-pointer appearance-none rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 pr-10 text-white hover:bg-slate-600 focus:border-sky-500 focus:ring-2 focus:ring-sky-500 focus:outline-none"
							style="background-image: none;"
						>
							<option value="all">All Ratings</option>
							{#each uniqueRatings as rating}
								<option value={rating}>{rating}</option>
							{/each}
						</select>
						<div
							class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400"
						>
							<IconChevronDown class="h-4 w-4" aria-hidden="true" />
						</div>
					</div>
				</div>
			</div>

			<!-- Results count -->
			<div class="mb-4 text-sm text-gray-400">
				Showing {filteredAndSortedRoster.length} members
			</div>

			<div class="overflow-x-auto rounded-lg bg-slate-800/80 shadow-xl backdrop-blur-sm">
				<table class="w-full text-white" role="table">
					<caption class="sr-only">
						Controller roster showing {filteredAndSortedRoster.length} members with their ratings, roles,
						and activity information. Use the search and filter controls above to narrow the results.
					</caption>
					<thead class="bg-slate-700">
						<tr>
							<th
								class="cursor-pointer px-4 py-3 text-left text-xs font-semibold tracking-wider text-gray-300 uppercase hover:text-white"
								onclick={() => handleSort('cid')}
							>
								<div class="flex items-center gap-1">
									CID
									{#if sortField === 'cid'}
										{#if sortDirection === 'asc'}
											<IconArrowUp class="h-3 w-3" />
										{:else}
											<IconArrowDown class="h-3 w-3" />
										{/if}
									{:else}
										<IconUnfoldMoreHorizontal class="h-3 w-3" />
									{/if}
								</div>
							</th>
							<th
								class="cursor-pointer px-4 py-3 text-left text-xs font-semibold tracking-wider text-gray-300 uppercase hover:text-white"
								onclick={() => handleSort('last_name')}
							>
								<div class="flex items-center gap-1">
									Name
									{#if sortField === 'last_name'}
										{#if sortDirection === 'asc'}
											<IconArrowUp class="h-3 w-3" />
										{:else}
											<IconArrowDown class="h-3 w-3" />
										{/if}
									{:else}
										<IconUnfoldMoreHorizontal class="h-3 w-3" />
									{/if}
								</div>
							</th>
							<th
								class="cursor-pointer px-4 py-3 text-left text-xs font-semibold tracking-wider text-gray-300 uppercase hover:text-white"
								onclick={() => handleSort('rating_short')}
							>
								<div class="flex items-center gap-1">
									Rating
									{#if sortField === 'rating_short'}
										{#if sortDirection === 'asc'}
											<IconArrowUp class="h-3 w-3" />
										{:else}
											<IconArrowDown class="h-3 w-3" />
										{/if}
									{:else}
										<IconUnfoldMoreHorizontal class="h-3 w-3" />
									{/if}
								</div>
							</th>
							<th
								class="cursor-pointer px-4 py-3 text-left text-xs font-semibold tracking-wider text-gray-300 uppercase hover:text-white"
								onclick={() => handleSort('certification')}
							>
								<div class="flex items-center gap-1">
									Certification
									{#if sortField === 'certification'}
										{#if sortDirection === 'asc'}
											<IconArrowUp class="h-3 w-3" />
										{:else}
											<IconArrowDown class="h-3 w-3" />
										{/if}
									{:else}
										<IconUnfoldMoreHorizontal class="h-3 w-3" />
									{/if}
								</div>
							</th>
							<th
								class="px-4 py-3 text-left text-xs font-semibold tracking-wider text-gray-300 uppercase"
								>Roles</th
							>
							<th
								class="cursor-pointer px-4 py-3 text-left text-xs font-semibold tracking-wider text-gray-300 uppercase hover:text-white"
								onclick={() => handleSort('facility_joined_at')}
							>
								<div class="flex items-center gap-1">
									Joined
									{#if sortField === 'facility_joined_at'}
										{#if sortDirection === 'asc'}
											<IconArrowUp class="h-3 w-3" />
										{:else}
											<IconArrowDown class="h-3 w-3" />
										{/if}
									{:else}
										<IconUnfoldMoreHorizontal class="h-3 w-3" />
									{/if}
								</div>
							</th>
							<th
								class="cursor-pointer px-4 py-3 text-left text-xs font-semibold tracking-wider text-gray-300 uppercase hover:text-white"
								onclick={() => handleSort('last_activity_at')}
							>
								<div class="flex items-center gap-1">
									Last Activity
									{#if sortField === 'last_activity_at'}
										{#if sortDirection === 'asc'}
											<IconArrowUp class="h-3 w-3" />
										{:else}
											<IconArrowDown class="h-3 w-3" />
										{/if}
									{:else}
										<IconUnfoldMoreHorizontal class="h-3 w-3" />
									{/if}
								</div>
							</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-600">
						{#each filteredAndSortedRoster as member}
							<tr class="border-b border-slate-600/50 transition-colors hover:bg-slate-700/30">
								<td class="px-4 py-3 text-sm whitespace-nowrap text-gray-400"
									>{member.controller.cid}</td
								>
								<td class="px-4 py-3 text-sm font-medium whitespace-nowrap text-white">
									{member.controller.fname}
									{member.controller.flag_nameprivacy
										? member.controller.cid
										: member.controller.lname}
								</td>
								<td class="px-4 py-3 text-sm whitespace-nowrap">
									<span
										class="inline-flex rounded-full bg-sky-600/90 px-2 py-1 text-xs font-semibold text-white shadow-sm"
									>
										{member.controller.rating_short}
									</span>
								</td>
								<td class="px-4 py-3 text-sm whitespace-nowrap">
									{#if member.certifications}
										{@const highestCert = getHighestCertification(member.certifications)}
										<div class="flex flex-wrap gap-1">
											<!-- Highest certified certificate -->
											{#if highestCert}
												<span
													class="inline-flex rounded-full bg-emerald-600/90 px-2 py-1 text-xs font-semibold text-white shadow-sm"
												>
													{highestCert.certification}
												</span>
											{/if}

											<!-- No certificates case -->
											{#if !highestCert}
												<span
													class="inline-flex rounded-full bg-gray-600/80 px-2 py-1 text-xs font-semibold text-gray-400 shadow-sm"
												>
													None
												</span>
											{/if}
										</div>
									{:else}
										<span
											class="inline-flex rounded-full bg-gray-600/80 px-2 py-1 text-xs font-semibold text-gray-400 shadow-sm"
										>
											None
										</span>
									{/if}
								</td>
								<td class="px-4 py-3 text-sm">
									<div class="flex flex-wrap gap-1">
										{#each member.controller.roles.filter((role) => role.facility === 'ZID') as role}
											<span
												class="inline-flex rounded bg-emerald-600/80 px-2 py-1 text-xs font-medium text-white"
											>
												{role.role}
											</span>
										{/each}
									</div>
								</td>
								<td class="px-4 py-3 text-sm whitespace-nowrap text-gray-400">
									{parseISO(member.controller.facility_join).toLocaleDateString()}
								</td>
								<td class="px-4 py-3 text-sm whitespace-nowrap text-gray-400">
									{parseISO(member.controller.lastactivity).toLocaleDateString()}
								</td>
							</tr>
						{:else}
							<tr>
								<td colspan="6" class="px-4 py-8 text-center text-gray-400">
									No members found matching your criteria.
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	</div>
</div>

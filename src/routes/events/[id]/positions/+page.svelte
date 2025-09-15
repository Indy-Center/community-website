<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll, goto } from '$app/navigation';
	import { page } from '$app/stores';
	import Modal from '$lib/components/Modal.svelte';
	import Panel from '$lib/components/Panel.svelte';
	import IconAccountGroup from '~icons/mdi/account-group';
	import IconPlus from '~icons/mdi/plus';
	import IconAccount from '~icons/mdi/account';
	import IconClose from '~icons/mdi/close';
	import IconStar from '~icons/mdi/star';
	import IconPublish from '~icons/mdi/publish';
	import IconDraft from '~icons/mdi/publish-off';
	import ActionToggle from '$lib/components/ActionToggle.svelte';

	let { data } = $props();

	const { event, users, artccInformation } = data;

	let modal: Modal | null = $state(null);
	let selectedFacility: string | null = $state(artccInformation?.facility?.id || null);
	let selectedPositions: Set<string> = $state(new Set());

	// Create local reactive state for positions
	let eventPositions = $state([...data.event.positions]);

	// Update local positions when data changes
	$effect(() => {
		eventPositions = [...data.event.positions];
	});

	const getAllPositions = (facility: any): any[] => {
		let positions = [...facility.positions];
		facility.childFacilities?.forEach((child: any) => {
			positions = positions.concat(getAllPositions(child));
		});
		return positions;
	};

	const getFacilityOwnPositions = (facility: any): any[] => {
		return [...(facility.positions || [])];
	};

	const getMajorFacilities = () => {
		if (!artccInformation) return [];

		const facilities = [];

		// Add main facility
		const mainFacility = {
			...artccInformation.facility,
			isMainFacility: true
		};
		facilities.push(mainFacility);

		// Add only immediate child facilities (no recursion) and sort alphabetically
		if (artccInformation.facility.childFacilities) {
			const childFacilities = artccInformation.facility.childFacilities
				.map((child: any) => ({
					...child,
					isMainFacility: false
				}))
				.sort((a: any, b: any) => a.name.localeCompare(b.name));

			facilities.push(...childFacilities);
		}

		return facilities;
	};

	const getPositionsGroupedByFacility = (selectedFacility: any) => {
		if (!selectedFacility) return [];

		// For main facility, just return its own positions (filtered)
		if (selectedFacility.isMainFacility) {
			const filteredPositions = getFacilityOwnPositions(selectedFacility).filter(
				(pos) => !isPositionAlreadyAdded(getPositionId(pos))
			);

			return filteredPositions.length > 0
				? [
						{
							facility: selectedFacility,
							positions: filteredPositions
						}
					]
				: [];
		}

		// For child facilities, group positions by their source facility
		const groups = [];

		// Add the main facility's positions (filtered)
		const mainPositions = getFacilityOwnPositions(selectedFacility).filter(
			(pos) => !isPositionAlreadyAdded(getPositionId(pos))
		);
		if (mainPositions.length > 0) {
			groups.push({
				facility: selectedFacility,
				positions: mainPositions
			});
		}

		// Recursively add positions from child facilities (filtered)
		const addChildPositions = (facility: any) => {
			if (facility.childFacilities) {
				facility.childFacilities.forEach((child: any) => {
					const childPositions = getFacilityOwnPositions(child).filter(
						(pos) => !isPositionAlreadyAdded(getPositionId(pos))
					);
					if (childPositions.length > 0) {
						groups.push({
							facility: child,
							positions: childPositions
						});
					}
					addChildPositions(child);
				});
			}
		};

		addChildPositions(selectedFacility);
		return groups;
	};

	const getStarredPositions = (facility: any, isMainFacility: boolean = false): any[] => {
		const positions = isMainFacility
			? getFacilityOwnPositions(facility)
			: getAllPositions(facility);
		return positions.filter((pos) => pos.starred && !isPositionAlreadyAdded(getPositionId(pos)));
	};

	const addAllStarredPositions = (facility: any, isMainFacility: boolean = false) => {
		const starredPositions = getStarredPositions(facility, isMainFacility);
		starredPositions.forEach((pos) => {
			const positionId = pos.defaultCallsign || pos.id;
			selectedPositions.add(positionId);
		});
		selectedPositions = new Set(selectedPositions);
	};

	const addStarredPositionsForFacility = (facility: any) => {
		const starredPositions = getFacilityOwnPositions(facility).filter(
			(pos) => pos.starred && !isPositionAlreadyAdded(getPositionId(pos))
		);
		starredPositions.forEach((pos) => {
			const positionId = getPositionId(pos);
			selectedPositions.add(positionId);
		});
		selectedPositions = new Set(selectedPositions);
	};

	const togglePosition = (positionId: string) => {
		if (selectedPositions.has(positionId)) {
			selectedPositions.delete(positionId);
		} else {
			selectedPositions.add(positionId);
		}
		selectedPositions = new Set(selectedPositions);
	};

	const addSelectedPositions = async () => {
		if (selectedPositions.size === 0) return;

		const form = document.getElementById('add-positions-form') as HTMLFormElement;
		form.innerHTML = '';

		selectedPositions.forEach((positionId) => {
			const input = document.createElement('input');
			input.type = 'hidden';
			input.name = 'position';
			input.value = positionId;
			form.appendChild(input);
		});

		form.requestSubmit();
		selectedPositions.clear();
		selectedPositions = new Set(selectedPositions);
		modal?.close();
	};

	const getPositionId = (position: any): string => {
		return position.defaultCallsign || position.id;
	};

	const isPositionAlreadyAdded = (positionId: string): boolean => {
		return eventPositions.some((eventPos) => eventPos.position === positionId);
	};

	const getUserDisplayName = (user: any) => {
		return user.preferredName || `${user.firstName} ${user.lastName}`;
	};

	// Get all positions from ARTCC data merged together
	const getAllPositionsFlat = () => {
		if (!artccInformation) return [];

		const allPositions: any[] = [];

		// Add main facility positions
		if (artccInformation.facility.positions) {
			allPositions.push(...artccInformation.facility.positions);
		}

		// Recursively add child facility positions
		const addChildPositions = (facility: any) => {
			if (facility.positions) {
				allPositions.push(...facility.positions);
			}
			if (facility.childFacilities) {
				facility.childFacilities.forEach(addChildPositions);
			}
		};

		artccInformation.facility.childFacilities?.forEach(addChildPositions);
		return allPositions;
	};

	const getPositionInfo = (positionId: string) => {
		const allPositions = getAllPositionsFlat();
		return allPositions.find((pos: any) => pos.id === positionId) || null;
	};

	const getPositionCallsign = (positionId: string) => {
		const posInfo = getPositionInfo(positionId);
		// If we have position info, return the callsign
		if (posInfo?.radioName) {
			return posInfo.radioName;
		}
		// Fallback for main facility positions that might use defaultCallsign
		if (posInfo?.defaultCallsign) {
			return posInfo.defaultCallsign;
		}
		// Final fallback to position ID
		return positionId;
	};

	const getPositionFrequency = (positionId: string) => {
		const posInfo = getPositionInfo(positionId);
		return posInfo?.frequency ? `${posInfo.frequency.toFixed(3)}` : 'N/A';
	};

	const getPositionType = (positionId: string) => {
		const posInfo = getPositionInfo(positionId);
		return posInfo?.positionType || 'Unknown';
	};

	const isPositionPrimary = (positionId: string) => {
		const posInfo = getPositionInfo(positionId);
		return posInfo?.isPrimary || false;
	};
</script>

<svelte:head>
	<title>Indy Center | {event?.name || 'Event'} - Positions</title>
</svelte:head>

<!-- Page Header -->
<div class="mb-8">
	<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
		<div class="flex-1">
			<h1 class="mb-2 text-3xl font-bold text-white">{event?.name || 'Event'}</h1>
			<p class="text-slate-400">Manage event positions and assignments</p>
		</div>
		<div class="flex flex-shrink-0 gap-3">
			<ActionToggle
				action="?/toggleRosterPublished"
				currentState={event.isRosterPublished}
				label={event.isRosterPublished ? 'Roster Published' : 'Roster Draft'}
				icon={event.isRosterPublished ? IconPublish : IconDraft}
				color={event.isRosterPublished ? 'green' : 'sky'}
			/>
			<button
				onclick={() => modal?.open()}
				class="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:bg-sky-700 focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-gray-900 focus:outline-none"
			>
				<IconPlus class="h-4 w-4" />
				Add Positions
			</button>
		</div>
	</div>
</div>

<!-- Position Requests Panel -->
{#if event.positionRequests && event.positionRequests.length > 0}
	<div class="mb-8">
		<Panel title="Position Requests" icon={IconAccount} mode="dark">
			<div class="divide-y divide-slate-700/60">
				{#each event.positionRequests as request}
					<div class="p-6 transition-colors hover:bg-slate-700/30">
						<div class="flex items-start justify-between">
							<div>
								<div class="font-medium text-white">
									{getUserDisplayName(request.user)} ({request.user.operatingInitials})
								</div>
								<div class="mt-1 text-sm text-slate-400">
									{request.comments || 'No comments provided'}
								</div>
							</div>
							<div class="text-xs text-slate-500">
								{new Date(request.createdAt).toLocaleDateString()}
							</div>
						</div>
					</div>
				{/each}
			</div>
		</Panel>
	</div>
{/if}

<!-- Event Positions Panel -->
<Panel title="Event Positions" icon={IconAccountGroup} mode="dark">
	{#key eventPositions.length}
		{#if eventPositions.length > 0}
			<div class="overflow-hidden">
				<table class="w-full">
					<thead class="bg-slate-700/50">
						<tr class="border-b border-slate-600">
							<th
								class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-slate-300 uppercase"
								>Position</th
							>
							<th
								class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-slate-300 uppercase"
								>Requirements</th
							>
							<th
								class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-slate-300 uppercase"
								>Assigned To</th
							>
							<th
								class="px-6 py-4 text-right text-xs font-semibold tracking-wider text-slate-300 uppercase"
								>Actions</th
							>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-700/60">
						{#each eventPositions as position}
							<tr class="transition-colors hover:bg-slate-700/30">
								<!-- Position Info -->
								<td class="px-6 py-4">
									{#if true}
										{@const posInfo = getPositionInfo(position.position)}
										<div class="flex items-center gap-3">
											<div>
												<div class="text-lg font-semibold text-white">
													{posInfo?.radioName}
												</div>
												<div class="text-sm text-slate-400">
													{posInfo?.name}
												</div>
											</div>
											{#if isPositionPrimary(position.position)}
												<div
													class="rounded-full bg-amber-400/20 px-2 py-1 text-xs font-medium text-amber-300"
												>
													Primary
												</div>
											{/if}
										</div>
									{/if}
								</td>

								<!-- Requirements -->
								<td class="px-6 py-4">
									<div class="text-sm">
										{#if position.requiredCertifications && position.requiredCertifications.length > 0}
											<div class="mb-2 flex flex-wrap gap-1">
												{#each position.requiredCertifications as cert}
													<span class="rounded bg-blue-500/20 px-2 py-1 text-xs text-blue-300"
														>{cert}</span
													>
												{/each}
											</div>
										{/if}
										{#if position.requiredEndorsements && position.requiredEndorsements.length > 0}
											<div class="flex flex-wrap gap-1">
												{#each position.requiredEndorsements as endorsement}
													<span class="rounded bg-purple-500/20 px-2 py-1 text-xs text-purple-300"
														>{endorsement}</span
													>
												{/each}
											</div>
										{:else if !position.requiredCertifications || position.requiredCertifications.length === 0}
											<span class="text-xs text-slate-500">None specified</span>
										{/if}
									</div>
								</td>

								<!-- Assignment -->
								<td class="px-6 py-4">
									<form
										method="POST"
										action="?/updateAssignment"
										use:enhance={() => {
											return async ({ result, update }) => {
												if (result.type === 'success') {
													await update({ reset: false });
												}
											};
										}}
										class="inline"
									>
										<input type="hidden" name="positionId" value={position.position} />
										<select
											name="userId"
											value={position.userId || ''}
											onchange={(e) => e.target.form.requestSubmit()}
											class="w-full rounded-lg border-0 bg-slate-700 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-sky-500"
										>
											<option value="">Unassigned</option>
											{#each users as user}
												<option value={user.id}>
													{getUserDisplayName(user)} ({user.operatingInitials})
												</option>
											{/each}
										</select>
									</form>
								</td>

								<!-- Actions -->
								<td class="px-6 py-4 text-right">
									<form
										method="POST"
										action="?/removePosition"
										use:enhance={({ formData }) => {
											const positionToRemove = formData.get('position') as string;

											return async ({ result, update }) => {
												if (result.type === 'success') {
													// Manually remove from local state
													eventPositions = eventPositions.filter(
														(p) => p.position !== positionToRemove
													);
													await update();
												}
											};
										}}
										class="inline"
									>
										<input type="hidden" name="position" value={position.position} />
										<button
											type="submit"
											class="inline-flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/20"
										>
											<IconClose class="h-4 w-4" />
											Remove
										</button>
									</form>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<div class="p-12 text-center">
				<div class="mb-4 flex justify-center">
					<div class="rounded-full bg-slate-700/50 p-4">
						<IconAccountGroup class="h-8 w-8 text-slate-400" />
					</div>
				</div>
				<h3 class="mb-2 text-lg font-medium text-white">No positions configured</h3>
				<p class="mb-6 text-slate-400">
					Add positions to this event to get started with controller assignments.
				</p>
				<button
					onclick={() => modal?.open()}
					class="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:bg-sky-700"
				>
					<IconPlus class="h-4 w-4" />
					Add Positions
				</button>
			</div>
		{/if}
	{/key}
</Panel>

<!-- Enhanced Add Positions Modal -->
<Modal title="Add Positions" bind:this={modal}>
	<div class="flex h-[70vh] max-h-[600px] w-[90vw] max-w-[1000px]">
		<!-- Facility Sidebar -->
		<div
			class="flex w-1/2 flex-col {selectedFacility
				? 'border-r border-slate-600'
				: ''} bg-slate-800/60"
		>
			<div class="flex-1 overflow-y-auto p-6">
				<h3 class="mb-6 text-sm font-semibold tracking-wider text-slate-300 uppercase">
					Facilities
				</h3>

				<!-- Major Facilities Only -->
				{#each getMajorFacilities() as facility}
					<div class="mb-2">
						<div
							class="group flex items-start gap-2 rounded-lg p-3 transition-colors hover:bg-slate-600/50"
						>
							<button
								class="min-w-0 flex-1 text-left"
								onclick={() =>
									(selectedFacility = selectedFacility === facility.id ? null : facility.id)}
							>
								<span class="break-words text-white {facility.isMainFacility ? 'font-medium' : ''}"
									>{facility.name}</span
								>
								<div class="text-xs text-slate-400">
									{getStarredPositions(facility, facility.isMainFacility).length} starred positions
								</div>
							</button>
							<button
								type="button"
								class="flex-shrink-0 rounded bg-sky-500/20 p-1.5 text-sky-300 transition-colors hover:bg-sky-500/30"
								onclick={(e) => {
									e.stopPropagation();
									addAllStarredPositions(facility, facility.isMainFacility);
								}}
							>
								<IconPlus class="h-4 w-4" />
							</button>
						</div>
					</div>
				{/each}

				{#if !selectedFacility}
					<div class="mt-8 text-center">
						<div class="mb-4 flex justify-center">
							<div class="rounded-full bg-slate-700/50 p-4">
								<IconAccountGroup class="h-8 w-8 text-slate-400" />
							</div>
						</div>
						<p class="text-slate-400">Select a facility to view positions</p>
					</div>
				{/if}
			</div>
		</div>

		<!-- Position Grid -->
		{#if selectedFacility}
			<div class="flex w-1/2 flex-col bg-slate-700/50">
				<div class="flex-1 overflow-y-auto p-6">
					{#if true}
						{@const facility = getMajorFacilities().find((f) => f.id === selectedFacility)}

						{#if facility}
							<h3 class="mb-4 text-lg font-semibold text-white">{facility.name}</h3>

							{#each getPositionsGroupedByFacility(facility) as group}
								{#if !facility.isMainFacility}
									<div class="mb-4">
										<div
											class="mb-3 flex items-center justify-between border-b border-slate-600 pb-2"
										>
											<h4 class="text-sm font-medium tracking-wider text-slate-300 uppercase">
												{group.facility.name}
											</h4>
											{#if group.positions.some((pos) => pos.starred)}
												<button
													type="button"
													class="flex-shrink-0 rounded bg-sky-500/20 p-1.5 text-sky-300 transition-colors hover:bg-sky-500/30"
													onclick={(e) => {
														e.stopPropagation();
														addStarredPositionsForFacility(group.facility);
													}}
													title="Add all starred positions from {group.facility.name}"
												>
													<IconPlus class="h-4 w-4" />
												</button>
											{/if}
										</div>
										<div class="grid gap-3">
											{#each group.positions as position}
												{@const positionId = getPositionId(position)}
												<div
													class="flex items-center justify-between rounded-lg border p-2.5 transition-all {selectedPositions.has(
														positionId
													)
														? 'border-sky-500 bg-sky-500/10'
														: 'border-slate-600 bg-slate-700/30 hover:bg-slate-700/50'}"
												>
													<div class="flex min-w-0 flex-1 items-center gap-3">
														<div class="min-w-0">
															<div class="flex items-center gap-1.5">
																<span class="font-mono text-sm font-semibold text-white"
																	>{position.radioName}</span
																>
																{#if position.starred}
																	<IconStar class="h-3 w-3 flex-shrink-0 text-yellow-400" />
																{/if}
															</div>
															<div class="truncate text-xs text-slate-400">{position.name}</div>
														</div>
													</div>
													<button
														type="button"
														class="flex-shrink-0 rounded px-2 py-1 text-xs font-medium transition-colors {selectedPositions.has(
															positionId
														)
															? 'border border-red-500/30 bg-red-500/20 text-red-300 hover:bg-red-500/30'
															: 'border border-sky-500/30 bg-sky-500/20 text-sky-300 hover:bg-sky-500/30'}"
														onclick={() => togglePosition(positionId)}
													>
														{selectedPositions.has(positionId) ? '−' : '+'}
													</button>
												</div>
											{/each}
										</div>
									</div>
								{:else}
									<div class="grid gap-3">
										{#each group.positions as position}
											{@const positionId = getPositionId(position)}
											<div
												class="flex items-center justify-between rounded-lg border p-2.5 transition-all {selectedPositions.has(
													positionId
												)
													? 'border-sky-500 bg-sky-500/10'
													: 'border-slate-600 bg-slate-700/30 hover:bg-slate-700/50'}"
											>
												<div class="flex min-w-0 flex-1 items-center gap-3">
													<div class="min-w-0">
														<div class="flex items-center gap-1.5">
															<span class="font-mono text-sm font-semibold text-white"
																>{position.radioName}</span
															>
															{#if position.starred}
																<IconStar class="h-3 w-3 flex-shrink-0 text-yellow-400" />
															{/if}
														</div>
														<div class="truncate text-xs text-slate-400">{position.name}</div>
													</div>
												</div>
												<button
													type="button"
													class="flex-shrink-0 rounded px-2 py-1 text-xs font-medium transition-colors {selectedPositions.has(
														positionId
													)
														? 'border border-red-500/30 bg-red-500/20 text-red-300 hover:bg-red-500/30'
														: 'border border-sky-500/30 bg-sky-500/20 text-sky-300 hover:bg-sky-500/30'}"
													onclick={() => togglePosition(positionId)}
												>
													{selectedPositions.has(positionId) ? '−' : '+'}
												</button>
											</div>
										{/each}
									</div>
								{/if}
							{/each}
						{/if}
					{/if}
				</div>
			</div>
		{/if}
	</div>

	<!-- Modal Footer -->
	<div
		class="flex items-center justify-between border-t border-slate-600 bg-slate-800/80 px-6 py-4"
	>
		<div class="text-sm text-slate-400">
			{selectedPositions.size} position{selectedPositions.size !== 1 ? 's' : ''} selected
		</div>
		<button
			type="button"
			onclick={addSelectedPositions}
			class="rounded-lg px-4 py-2 text-sm font-medium transition-colors {selectedPositions.size ===
			0
				? 'cursor-not-allowed bg-slate-600 text-slate-400'
				: 'bg-sky-600 text-white hover:bg-sky-700'}"
			disabled={selectedPositions.size === 0}
		>
			Add {selectedPositions.size} Position{selectedPositions.size !== 1 ? 's' : ''}
		</button>
	</div>

	<form
		id="add-positions-form"
		method="POST"
		action="?/addPosition"
		use:enhance={({ formData }) => {
			const newPositions = formData.getAll('position') as string[];

			return async ({ result, update }) => {
				if (result.type === 'success') {
					// Manually add new positions to local state
					const positionsToAdd = newPositions.map((position) => ({
						position,
						eventId: event.id,
						userId: null,
						requiredCertifications: [],
						requiredEndorsements: [],
						createdAt: new Date(),
						updatedAt: new Date()
					}));

					eventPositions = [...eventPositions, ...positionsToAdd];
					await update();
				}
			};
		}}
		class="hidden"
	></form>
</Modal>

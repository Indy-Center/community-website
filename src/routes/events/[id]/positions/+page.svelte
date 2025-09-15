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

	let modal: Modal | null = $state(null);
	let selectedFacility: string | null = $state(null);
	let selectedPositions: Set<string> = $state(new Set());

	// Create local reactive state for positions
	let eventPositions = $state([...data.event.positions]);

	const { event, users, artccInformation } = data;

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

	const getStarredPositions = (facility: any): any[] => {
		return getAllPositions(facility).filter((pos) => pos.starred);
	};

	const addAllStarredPositions = (facility: any) => {
		const starredPositions = getStarredPositions(facility);
		starredPositions.forEach((pos) => {
			const positionId = pos.defaultCallsign || pos.id;
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
	};

	const getPositionId = (position: any): string => {
		return position.defaultCallsign || position.id;
	};

	const getUserDisplayName = (user: any) => {
		return user.preferredName || `${user.firstName} ${user.lastName}`;
	};

	const getPositionInfo = (positionId: string) => {
		const findPositionInFacility = (facility: any): any => {
			// Check main facility positions (have defaultCallsign)
			const mainPos = facility.positions?.find(
				(pos: any) => pos.defaultCallsign === positionId || pos.id === positionId
			);
			if (mainPos) return mainPos;

			// Recursively check child facilities
			for (const child of facility.childFacilities || []) {
				const found = findPositionInFacility(child);
				if (found) return found;
			}
			return null;
		};

		return findPositionInFacility(artccInformation.facility);
	};

	const getPositionCallsign = (positionId: string) => {
		const posInfo = getPositionInfo(positionId);
		// If we have position info, return the callsign or readable ID
		if (posInfo) {
			return posInfo.defaultCallsign || posInfo.id || positionId;
		}
		// If no position info found, try to make the ID more readable
		// Remove the prefix and show the actual callsign part if it exists
		if (positionId.includes('_')) {
			const parts = positionId.split('_');
			return parts[parts.length - 1]; // Return the last part after underscore
		}
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
												{#if posInfo?.radioName}
													<div class="text-lg font-semibold text-white">{posInfo.radioName}</div>
												{:else}
													<div class="text-lg font-semibold text-white">
														{getPositionCallsign(position.position)}
													</div>
												{/if}
												<div class="text-sm text-slate-400">
													{#if posInfo?.name && posInfo?.defaultCallsign}
														{posInfo.name} • {posInfo.defaultCallsign}
													{:else if posInfo?.name}
														{posInfo.name}
													{:else if posInfo?.defaultCallsign}
														{posInfo.defaultCallsign}
													{:else}
														{getPositionCallsign(position.position)}
													{/if}
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
													eventPositions = eventPositions.filter(p => p.position !== positionToRemove);
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
		<div class="flex w-72 flex-col border-r border-slate-600 bg-slate-700/30">
			<div class="flex-1 overflow-y-auto p-4">
				<h3 class="mb-4 text-sm font-semibold tracking-wider text-slate-400 uppercase">
					Facilities
				</h3>

				<!-- Main Facility -->
				<div class="mb-2">
					<div
						class="group flex items-start gap-2 rounded-lg p-3 transition-colors hover:bg-slate-600/50"
					>
						<button
							class="min-w-0 flex-1 text-left"
							onclick={() =>
								(selectedFacility =
									selectedFacility === artccInformation.facility.id
										? null
										: artccInformation.facility.id)}
						>
							<span class="font-medium break-words text-white"
								>{artccInformation.facility.name}</span
							>
							<div class="text-xs text-slate-400">
								{getStarredPositions(artccInformation.facility).length} starred positions
							</div>
						</button>
						<button
							type="button"
							class="flex-shrink-0 rounded bg-sky-500/20 p-1.5 text-sky-300 transition-colors hover:bg-sky-500/30"
							onclick={(e) => {
								e.stopPropagation();
								addAllStarredPositions(artccInformation.facility);
							}}
						>
							<IconPlus class="h-4 w-4" />
						</button>
					</div>
				</div>

				<!-- Child Facilities -->
				{#each artccInformation.facility.childFacilities as facility}
					<div class="mb-2">
						<div
							class="group flex items-start gap-2 rounded-lg p-3 transition-colors hover:bg-slate-600/50"
						>
							<button
								class="min-w-0 flex-1 text-left"
								onclick={() =>
									(selectedFacility = selectedFacility === facility.id ? null : facility.id)}
							>
								<span class="break-words text-white">{facility.name}</span>
								<div class="text-xs text-slate-400">
									{getStarredPositions(facility).length} starred positions
								</div>
							</button>
							<button
								type="button"
								class="flex-shrink-0 rounded bg-sky-500/20 p-1.5 text-sky-300 transition-colors hover:bg-sky-500/30"
								onclick={(e) => {
									e.stopPropagation();
									addAllStarredPositions(facility);
								}}
							>
								<IconPlus class="h-4 w-4" />
							</button>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Position Grid -->
		<div class="flex flex-1 flex-col bg-slate-800/50">
			<div class="flex-1 overflow-y-auto p-6">
				{#if selectedFacility}
					{@const facility =
						selectedFacility === artccInformation.facility.id
							? artccInformation.facility
							: artccInformation.facility.childFacilities.find((f) => f.id === selectedFacility)}

					{#if facility}
						<h3 class="mb-4 text-lg font-semibold text-white">{facility.name}</h3>
						<div class="grid gap-3">
							{#each getAllPositions(facility) as position}
								{@const positionId = getPositionId(position)}
								<div
									class="flex items-center justify-between rounded-lg border p-4 transition-all {selectedPositions.has(
										positionId
									)
										? 'border-sky-500 bg-sky-500/10'
										: 'border-slate-600 bg-slate-700/30 hover:bg-slate-700/50'}"
								>
									<div>
										<div class="flex items-center gap-2">
											<span class="font-mono font-semibold text-white">{positionId}</span>
											{#if position.starred}
												<IconStar class="h-4 w-4 text-yellow-400" />
											{/if}
										</div>
										<div class="text-sm text-slate-400">{position.name}</div>
										{#if position.radioName}
											<div class="text-xs text-slate-500">{position.radioName}</div>
										{/if}
									</div>
									<button
										type="button"
										class="rounded-lg px-4 py-2 text-sm font-medium transition-colors {selectedPositions.has(
											positionId
										)
											? 'border border-red-500/30 bg-red-500/20 text-red-300 hover:bg-red-500/30'
											: 'border border-sky-500/30 bg-sky-500/20 text-sky-300 hover:bg-sky-500/30'}"
										onclick={() => togglePosition(positionId)}
									>
										{selectedPositions.has(positionId) ? 'Remove' : 'Add'}
									</button>
								</div>
							{/each}
						</div>
					{/if}
				{:else}
					<div class="flex h-full items-center justify-center text-center">
						<div>
							<div class="mb-4 flex justify-center">
								<div class="rounded-full bg-slate-700/50 p-4">
									<IconAccountGroup class="h-8 w-8 text-slate-400" />
								</div>
							</div>
							<p class="text-slate-400">Select a facility to view positions</p>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Modal Footer -->
	<div
		class="flex items-center justify-between border-t border-slate-600 bg-slate-700/50 px-6 py-4"
	>
		<div class="text-sm text-slate-400">
			{selectedPositions.size} position{selectedPositions.size !== 1 ? 's' : ''} selected
		</div>
		<div class="flex gap-3">
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
			<button
				type="button"
				onclick={() => modal?.close()}
				class="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-700"
			>
				Done
			</button>
		</div>
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
					const positionsToAdd = newPositions.map(position => ({
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

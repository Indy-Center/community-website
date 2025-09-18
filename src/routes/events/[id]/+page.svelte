<script lang="ts">
	import { enhance } from '$app/forms';
	import IconClock from '~icons/mdi/clock-outline';
	import IconPublish from '~icons/mdi/publish';
	import IconDraft from '~icons/mdi/publish-off';
	import IconEdit from '~icons/mdi/pencil';
	import IconTextLong from '~icons/mdi/text-long';
	import IconAccountGroup from '~icons/mdi/account-group';
	import IconPlus from '~icons/mdi/plus';
	import IconCheck from '~icons/mdi/check';
	import ImageWithFallback from '$lib/components/ui/ImageWithFallback.svelte';
	import IconClose from '~icons/mdi/close';
	import Panel from '$lib/components/Panel.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import EventDetailsPanel from '$lib/components/events/EventDetailsPanel.svelte';
	import DeleteButton from '$lib/components/forms/DeleteButton.svelte';
	import { canManageEvents } from '$lib/utils/permissions.js';
	import ActionToggle from '$lib/components/ActionToggle.svelte';
	import { isSignUpClosed } from '$lib/utils/events.js';
	import { supportsRosters } from '$lib/config/events';
	import type { VnasFacility, VnasPosition } from '$lib/types/vnas.js';

	const { data } = $props();
	const { event, artccInformation, user, userId } = data;

	let positionRequestModal: Modal | null = $state(null);

	// Check if user has controller membership (for position sign-ups)
	const hasControllerAccess = $derived(user?.membership === 'controller');

	/**
	 * Position sorting puts the positions in order of Approach > Tower > Ground > Delivery > Ramp/Other
	 * @param positions
	 */
	function sortPositions(positions: VnasPosition[] = []) {
		console.log('sorting positions', positions);
		// We have to do a partial callsign match because VnasPosition doesn't tell us.
		// These are the suffixes to look for
		const SORT_ORDER = ['APP', 'TWR', 'GND', 'DEL', 'RMP'];

		return positions.sort((a, b) => {
			const aIndex = SORT_ORDER.indexOf(a.callsign.slice(-3).toUpperCase());
			const bIndex = SORT_ORDER.indexOf(b.callsign.slice(-3).toUpperCase());

			// Sort them alphabetically if they are the same type of position
			if (aIndex === bIndex) {
				return a.callsign.localeCompare(b.callsign);
			}

			return aIndex - bIndex;
		});
	}

	// Get all positions from ARTCC data merged together
	const getAllPositionsFlat = () => {
		if (!artccInformation) return [];

		const allPositions: any[] = [];

		// Add main facility positions
		if (artccInformation.facility.positions) {
			allPositions.push(...sortPositions(artccInformation.facility.positions));
		}

		// Recursively add child facility positions
		const addChildPositions = (facility: any) => {
			if (facility.positions) {
				allPositions.push(...sortPositions(facility.positions));
			}
			if (facility.childFacilities) {
				facility.childFacilities.forEach(addChildPositions);
			}
		};

		artccInformation.facility.childFacilities?.forEach(addChildPositions);

		return sortPositions(allPositions);
	};

	// Get position info from ARTCC data by searching the database ID
	const getPositionInfo = (positionId: string) => {
		const allPositions = getAllPositionsFlat();
		return allPositions.find((pos: any) => pos.id === positionId) || null;
	};

	const getUserDisplayName = (user: any) => {
		return user.preferredName || `${user.firstName} ${user.lastName}`;
	};

	// Group positions by facility
	const groupPositionsByFacility = (positions: any[]) => {
		if (!artccInformation) {
			return [{ facilityName: 'Positions', positions }];
		}

		const groups: { [key: string]: { facilityName: string; positions: any[] } } = {};

		const findPositionFacility = (
			positionId: string,
			facility: any,
			facilityName: string
		): string => {
			// Check if position exists in this facility
			const found = facility.positions?.some(
				(pos: any) => pos.defaultCallsign === positionId || pos.id === positionId
			);

			if (found) return facilityName;

			// Check child facilities
			for (const child of facility.childFacilities || []) {
				const childResult = findPositionFacility(positionId, child, child.name);
				if (childResult !== 'Unknown') return childResult;
			}

			return 'Unknown';
		};

		positions.forEach((position) => {
			const facilityName = findPositionFacility(
				position.position,
				artccInformation.facility,
				artccInformation.facility.name
			);

			if (!groups[facilityName]) {
				groups[facilityName] = { facilityName, positions: [] };
			}
			groups[facilityName].positions.push(position);
		});

		// Sort positions within each facility group using the actual VnasPosition data
		const sortedGroups = Object.values(groups).map(group => ({
			...group,
			positions: group.positions.sort((a, b) => {
				const aVnasPos = getPositionInfo(a.position);
				const bVnasPos = getPositionInfo(b.position);

				if (!aVnasPos || !bVnasPos) {
					return 0; // Keep original order if position data not found
				}

				// First, sort by position type
				const SORT_ORDER = ['APP', 'TWR', 'GND', 'DEL', 'RMP'];
				const aCallsign = aVnasPos.defaultCallsign || aVnasPos.callsign || '';
				const bCallsign = bVnasPos.defaultCallsign || bVnasPos.callsign || '';
				const aType = aCallsign.slice(-3).toUpperCase();
				const bType = bCallsign.slice(-3).toUpperCase();
				const aIndex = SORT_ORDER.indexOf(aType);
				const bIndex = SORT_ORDER.indexOf(bType);

				if (aIndex !== bIndex) {
					return aIndex - bIndex;
				}

				// Then sort by starred status (starred positions first within same type)
				const aStarred = (aVnasPos as any).starred || false;
				const bStarred = (bVnasPos as any).starred || false;
				if (aStarred !== bStarred) {
					return bStarred ? 1 : -1; // starred positions come first
				}

				// Finally, sort alphabetically
				return aCallsign.localeCompare(bCallsign);
			})
		}));

		return sortedGroups;
	};
</script>

<svelte:head>
	<title>Indy Center | {event?.name || 'Event'}</title>
</svelte:head>

{#if event}
	<!-- Event Header -->
	<div class="mb-8">
		<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
			<div class="flex-1">
				<h1 class="mb-3 text-3xl font-bold text-white">{event.name}</h1>
			</div>

			<!-- Action Buttons (if user has permissions) -->
			{#if canManageEvents(data?.roles)}
				<div class="flex flex-shrink-0 gap-3">
					<ActionToggle
						action="?/togglePublish"
						currentState={event.isPublished}
						label={event.isPublished ? 'Published' : 'Draft'}
						icon={event.isPublished ? IconPublish : IconDraft}
						color="green"
					/>

					{#if supportsRosters(event.type) && event.rosterType !== 'none'}
						<a
							href="/events/{event.id}/positions"
							class="inline-flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:bg-slate-600 focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-gray-900 focus:outline-none"
						>
							<IconAccountGroup class="h-4 w-4" />
							Edit Positions
						</a>
					{/if}

					<a
						href="/events/{event.id}/edit"
						class="inline-flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:bg-slate-600 focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-gray-900 focus:outline-none"
					>
						<IconEdit class="h-4 w-4" />
						Edit Event
					</a>

					<DeleteButton />
				</div>
			{/if}
		</div>
	</div>

	<!-- Banner and Event Information -->
	<div class="mb-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
		<!-- Event Banner -->
		<div
			class="overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-800/60 backdrop-blur-sm"
		>
			<ImageWithFallback
				src={event.bannerUrl}
				alt="{event.name} banner"
				class="h-64 w-full object-cover sm:h-80 lg:h-full"
				fallbackClass="h-64 w-full sm:h-80 lg:h-full bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900"
			/>
		</div>

		<!-- Event Information -->
		<EventDetailsPanel {event} />
	</div>

	<!-- Description and Positions -->
	<div class="grid grid-cols-1 gap-8 {supportsRosters(event.type) && event.rosterType !== 'none' ? 'lg:grid-cols-2' : ''}">
		<!-- Event Description -->
		<Panel title="Event Details" icon={IconTextLong} mode="dark">
			<div class="p-8">
				<div class="prose max-w-none prose-invert">
					<p class="leading-relaxed whitespace-pre-line text-slate-300">{event.description}</p>
				</div>
			</div>
		</Panel>

		<!-- Event Positions -->
		{#if supportsRosters(event.type) && event.rosterType !== 'none'}
			<Panel title="Event Positions" icon={IconAccountGroup} mode="dark">
				<!-- Roster is Released! or the event is still in draft -->
				{#if event.isRosterPublished}
					<!-- Published Roster -->
					{#if event.positions && event.positions.length > 0}
						<div class="p-6">
							{#each groupPositionsByFacility(event.positions) as facilityGroup}
								<div class="mb-6 last:mb-0">
									<!-- Facility Header -->
									<div class="mb-4 border-b border-slate-600 pb-2">
										<h3 class="text-sm font-semibold tracking-wider text-slate-300 uppercase">
											{facilityGroup.facilityName}
										</h3>
									</div>

									<!-- Positions in this facility -->
									<div class="grid gap-3">
										{#each facilityGroup.positions as position}
											<div class="flex items-center justify-between rounded-lg bg-slate-700/30 p-4">
												<div class="flex-1">
													<div class="font-semibold text-white">
														{getPositionInfo(position.position).radioName}
													</div>
													<div class="text-sm text-slate-400">
														{getPositionInfo(position.position).name}
													</div>
												</div>

												<div class="flex items-center gap-3">
													{#if position.user}
														<!-- Position is assigned -->
														<div class="text-right">
															<div class="font-medium text-white">
																{getUserDisplayName(position.user)}
															</div>
														</div>
														{#if !isSignUpClosed(event) && hasControllerAccess && event.rosterType === 'open' && position.userId === userId}
															<!-- User can unassign themselves -->
															<form
																method="POST"
																action="?/unassignFromPosition"
																use:enhance={() => {
																	return async ({ result }) => {
																		if (result.type === 'success') {
																			window.location.reload();
																		}
																	};
																}}
															>
																<input type="hidden" name="position" value={position.position} />
																<button
																	type="submit"
																	class="rounded border border-red-500/30 bg-red-500/20 px-3 py-1 text-xs text-red-300 hover:bg-red-500/30"
																>
																	<IconClose class="h-3 w-3" />
																</button>
															</form>
														{/if}
													{:else if hasControllerAccess && event.rosterType === 'open' && !isSignUpClosed(event)}
														<!-- Open position for sign-up -->
														<form
															method="POST"
															action="?/signUpForPosition"
															use:enhance={() => {
																return async ({ result }) => {
																	if (result.type === 'success') {
																		window.location.reload();
																	}
																};
															}}
														>
															<input type="hidden" name="position" value={position.position} />
															<button
																type="submit"
																class="rounded border border-sky-500/30 bg-sky-500/20 px-4 py-2 text-sm font-medium text-sky-300 hover:bg-sky-500/30"
															>
																<IconPlus class="mr-1 inline h-4 w-4" />
																Sign Up
															</button>
														</form>
													{:else}
														<!-- Position unassigned, no access or assigned roster -->
														<div class="text-sm text-slate-500">Unassigned</div>
													{/if}
												</div>
											</div>
										{/each}
									</div>
								</div>
							{/each}
						</div>
					{:else}
						<div class="p-8 text-center">
							<div class="text-slate-400">No positions configured for this event.</div>
						</div>
					{/if}
					<!-- Assigned Roster (not released yet) -->
				{:else if event.rosterType === 'assigned'}
					{#if hasControllerAccess}
						<!-- Request submission section for controllers -->
						<div class="p-8 text-center">
							{#if event.positionRequests && event.positionRequests.some((req) => req.userId === userId)}
								<!-- User already has a request -->
								<div class="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
									<div class="font-medium text-yellow-300">Request Submitted</div>
									<div class="mt-1 text-sm text-slate-400">
										You have already submitted a position request for this event.
									</div>
								</div>
							{:else}
								<!-- User can submit a request -->
								<div class="mb-4">
									<h3 class="text-lg font-medium text-white">Position Requests</h3>
									<p class="text-slate-400">Request to be assigned a position for this event.</p>
								</div>
								<button
									onclick={() => positionRequestModal?.open()}
									class="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-700"
								>
									<IconPlus class="h-4 w-4" />
									Request Position
								</button>
							{/if}
						</div>

						{#if event.positionRequests && event.positionRequests.length > 0}
							<!-- Show existing position requests below submission section -->
							<div class="border-t border-slate-700/60">
								<div class="px-6 pt-3 pb-1">
									<h4 class="text-xs font-semibold tracking-wider text-slate-400 uppercase">Current Requests</h4>
								</div>
								<div class="divide-y divide-slate-700/60">
									{#each event.positionRequests as request}
										<div class="px-6 py-4 transition-colors hover:bg-slate-700/30">
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
							</div>
						{/if}
					{:else}
						<!-- No controller access -->
						<div class="p-8 text-center">
							<div class="text-slate-400">
								Position requests are available for controllers only.
							</div>
						</div>
					{/if}
				{:else}
					<div class="p-8 text-center">
						<div class="text-slate-400">The roster is not yet released.</div>
					</div>
				{/if}
			</Panel>
		{/if}
	</div>
{:else}
	<!-- Event Not Found -->
	<div class="py-12 text-center">
		<div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-700">
			<IconClock class="h-8 w-8 text-gray-400" />
		</div>
		<h1 class="mb-2 text-2xl font-bold text-white">Event Not Found</h1>
		<p class="mb-6 text-gray-400">
			The event you're looking for doesn't exist or has been removed.
		</p>
	</div>
{/if}

<!-- Position Request Modal -->
<Modal title="Request Position" bind:this={positionRequestModal}>
	<div class="w-[500px] max-w-[90vw]">
		<form
			method="POST"
			action="?/requestPosition"
			use:enhance={() => {
				return async ({ result }) => {
					if (result.type === 'success') {
						positionRequestModal?.close();
						window.location.reload();
					}
				};
			}}
		>
			<div class="px-6 py-4">
				<div>
					<label for="comments" class="mb-3 block text-sm font-semibold text-white">
						Comments <span class="font-normal text-slate-400">(Optional)</span>
					</label>
					<textarea
						name="comments"
						id="comments"
						rows="4"
						placeholder="Let the event coordinators know about your experience, preferences, or availability..."
						class="w-full rounded-lg border border-slate-600 bg-slate-700/50 px-4 py-3 text-sm text-white placeholder-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
					></textarea>
				</div>
			</div>

			<div class="flex justify-end gap-3 px-6 pb-4">
				<button
					type="button"
					onclick={() => positionRequestModal?.close()}
					class="cursor-pointer rounded-lg bg-slate-600 px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700"
				>
					Cancel
				</button>
				<button
					type="submit"
					class="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky-700"
				>
					<IconPlus class="h-4 w-4" />
					Submit Request
				</button>
			</div>
		</form>
	</div>
</Modal>

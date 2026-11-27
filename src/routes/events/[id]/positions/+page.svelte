<script lang="ts">
	import { enhance } from '$app/forms';
	import {
		Badge,
		Button,
		Chip,
		ChoiceCard,
		EmptyState,
		Field,
		Fieldset,
		Heading,
		Icon,
		Modal,
		PageHeader,
		Panel,
		Position,
		Select,
		Table,
		Text,
		Th,
		Time
	} from '@indy-center/centerline-svelte';
	import {
		mdiAccount,
		mdiAccountGroup,
		mdiArrowLeft,
		mdiClose,
		mdiPlus,
		mdiPublish,
		mdiPublishOff,
		mdiStar
	} from '@mdi/js';
	import ControllerPicker from '$lib/components/events/ControllerPicker.svelte';
	import { credentialName } from '$lib/credentials';
	import BookingProblems from '$lib/components/events/BookingProblems.svelte';

	let { data } = $props();

	const { event, users, artccInformation } = data;

	let addOpen = $state(false);
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
		addOpen = false;
	};

	const getPositionId = (position: any): string => {
		return position.defaultCallsign || position.id;
	};

	const isPositionAlreadyAdded = (positionId: string): boolean => {
		return eventPositions.some((eventPos) => eventPos.position === positionId);
	};

	const getUserDisplayName = (user: any) => {
		return user?.preferredName || `${user?.firstName} ${user?.lastName}`;
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
	<title>Positions | {event?.name || 'Event'} | Indy Center</title>
</svelte:head>

<PageHeader title={event?.name || 'Event'} class="mb-8">
	<!-- The roster's state in words and colour; the button on the right changes it -->
	<Badge variant={event.isRosterPublished ? 'green' : 'yellow'} pill class="mr-2 align-middle">
		{event.isRosterPublished ? 'Roster released' : 'Roster draft'}
	</Badge>
	Manage the event's positions and who's assigned to them.
	{#snippet actions()}
		<Button variant="secondary" href="/events/{event?.id}">
			<Icon path={mdiArrowLeft} />
			Back to event
		</Button>
		<form method="POST" action="?/toggleRosterPublished">
			<Button type="submit" variant="secondary">
				<Icon path={event.isRosterPublished ? mdiPublishOff : mdiPublish} />
				{event.isRosterPublished ? 'Unrelease roster' : 'Release roster'}
			</Button>
		</form>
		<Button onclick={() => (addOpen = true)}>
			<Icon path={mdiPlus} />
			Add positions
		</Button>
	{/snippet}
</PageHeader>

{#if data.bookingProblems.length > 0}
	<div class="mb-8">
		<!-- The dismiss action lives on the event page, beside the event's other actions -->
		<BookingProblems
			problems={data.bookingProblems}
			dismissAction="/events/{event.id}?/dismissBookingProblems"
		/>
	</div>
{/if}

{#if event.positionRequests && event.positionRequests.length > 0}
	<Panel title="Position requests" level={2} flush class="mb-8">
		{#snippet icon()}<Icon path={mdiAccount} />{/snippet}
		<ul class="divide-y divide-border">
			{#each event.positionRequests as request (request.userId)}
				<li class="flex items-start justify-between gap-3 px-4 py-3">
					<div>
						<span class="font-medium text-foreground">{getUserDisplayName(request.user)}</span>
						{#if request.user?.operatingInitials}
							<span class="font-mono text-muted-foreground">
								({request.user.operatingInitials})
							</span>
						{/if}
						<Text size="small" class="mt-1">{request.comments || 'No comments'}</Text>
					</div>
					{#if request.createdAt}
						<Text as="span" size="small" class="shrink-0">
							<Time value={request.createdAt} show="datetime" />
						</Text>
					{/if}
				</li>
			{/each}
		</ul>
	</Panel>
{/if}

<Panel title="Event positions" level={2}>
	{#snippet icon()}<Icon path={mdiAccountGroup} />{/snippet}
	{#key eventPositions.length}
		{#if eventPositions.length > 0}
			<Table hideCaption>
				{#snippet caption()}The event's positions{/snippet}
				<thead>
					<tr>
						<Th scope="col">Position</Th>
						<Th scope="col">Requirements</Th>
						<Th scope="col">Assigned to</Th>
						<!-- relative keeps the hidden label inside the scroll region on phones -->
						<Th scope="col" class="relative"><span class="sr-only">Actions</span></Th>
					</tr>
				</thead>
				<tbody>
					{#each eventPositions as position (position.position)}
						{@const posInfo = getPositionInfo(position.position)}
						<tr>
							<td>
								<div class="flex items-center gap-2">
									<Position
										callsign={posInfo?.defaultCallsign || posInfo?.callsign || position.position}
										positionId={position.position}
									/>
									{#if isPositionPrimary(position.position)}
										<Badge variant="yellow" size="sm">Primary</Badge>
									{/if}
								</div>
							</td>
							<td>
								{#if position.requiredCertifications?.length || position.requiredEndorsements?.length}
									<div class="flex flex-wrap gap-1">
										{#each position.requiredCertifications ?? [] as cert (cert)}
											<Chip variant="certification">{credentialName(data.credentials, cert)}</Chip>
										{/each}
										{#each position.requiredEndorsements ?? [] as endorsement (endorsement)}
											<Chip variant="endorsement">
												{credentialName(data.credentials, endorsement)}
											</Chip>
										{/each}
									</div>
								{:else}
									<Text as="span" size="small">None</Text>
								{/if}
							</td>
							<td>
								<form
									method="POST"
									action="?/updateAssignment"
									use:enhance={() =>
										async ({ result, update }) => {
											if (result.type === 'success') await update({ reset: false });
										}}
								>
									<input type="hidden" name="positionId" value={position.position} />
									<ControllerPicker
										name="userId"
										{users}
										value={position.userId}
										onselect={(form) => form?.requestSubmit()}
									/>
								</form>
							</td>
							<td class="text-right">
								<form
									method="POST"
									action="?/removePosition"
									use:enhance={({ formData }) => {
										const positionToRemove = formData.get('position') as string;
										return async ({ result, update }) => {
											if (result.type === 'success') {
												// Taken off the list at once, before the page reloads its data
												eventPositions = eventPositions.filter(
													(p) => p.position !== positionToRemove
												);
												await update();
											}
										};
									}}
								>
									<input type="hidden" name="position" value={position.position} />
									<Button type="submit" variant="danger" size="sm">
										<Icon path={mdiClose} />
										Remove
									</Button>
								</form>
							</td>
						</tr>
					{/each}
				</tbody>
			</Table>
		{:else}
			<EmptyState title="No positions yet" level={3}>
				{#snippet icon()}<Icon path={mdiAccountGroup} />{/snippet}
				Add positions to this event to start assigning controllers.
				{#snippet action()}
					<Button onclick={() => (addOpen = true)}>
						<Icon path={mdiPlus} />
						Add positions
					</Button>
				{/snippet}
			</EmptyState>
		{/if}
	{/key}
</Panel>

<!-- One position as a card, as the old dialog had them: its radio name, then its sector, and a
     star for the facility's starred ones. A tick in the card picks it. -->
{#snippet positionChoice(position: any)}
	{@const positionId = getPositionId(position)}
	<ChoiceCard
		type="checkbox"
		label={position.radioName}
		checked={selectedPositions.has(positionId)}
		onchange={() => togglePosition(positionId)}
	>
		<span class="inline-flex items-center gap-1">
			{position.name}
			{#if position.starred}
				<Icon path={mdiStar} label="Starred" />
			{/if}
		</span>
	</ChoiceCard>
{/snippet}

<Modal title="Add positions" size="lg" bind:open={addOpen}>
	{@const facilities = getMajorFacilities()}
	{@const facility = facilities.find((f) => f.id === selectedFacility)}
	<div class="flex flex-col gap-4">
		<div class="flex flex-wrap items-end gap-2">
			<Field label="Facility" class="min-w-0 flex-1">
				{#snippet children(control)}
					<Select {...control} bind:value={selectedFacility}>
						{#each facilities as option (option.id)}
							<option value={option.id}>
								{option.name} ({getStarredPositions(option, option.isMainFacility).length} starred)
							</option>
						{/each}
					</Select>
				{/snippet}
			</Field>
			{#if facility}
				<Button
					variant="secondary"
					onclick={() => addAllStarredPositions(facility, facility.isMainFacility)}
					disabled={getStarredPositions(facility, facility.isMainFacility).length === 0}
				>
					<Icon path={mdiStar} />
					Choose all starred
				</Button>
			{/if}
		</div>

		<div class="max-h-[50vh] overflow-y-auto">
			{#if facility}
				{@const groups = getPositionsGroupedByFacility(facility)}
				{#each groups as group (group.facility.id)}
					<section class="mb-6 last:mb-0">
						{#if !facility.isMainFacility && group.positions.some((pos) => pos.starred)}
							<div class="mb-1 flex justify-end">
								<Button
									variant="secondary"
									size="sm"
									onclick={() => addStarredPositionsForFacility(group.facility)}
								>
									<Icon path={mdiStar} />
									Choose starred in {group.facility.name}
								</Button>
							</div>
						{/if}
						<Fieldset legend={group.facility.name}>
							{#each group.positions as position (getPositionId(position))}
								{@render positionChoice(position)}
							{/each}
						</Fieldset>
					</section>
				{:else}
					<EmptyState size="inline">Every position here is already on the event.</EmptyState>
				{/each}
			{:else}
				<EmptyState size="inline">Choose a facility to see its positions.</EmptyState>
			{/if}
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
					// Shown at once, before the page reloads its data
					const positionsToAdd = newPositions.map((position) => ({
						position,
						eventId: event.id,
						userId: null,
						user: null,
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

	{#snippet actions()}
		<Text as="span" size="small" class="mr-auto self-center">
			{selectedPositions.size} chosen
		</Text>
		<Button variant="secondary" onclick={() => (addOpen = false)}>Cancel</Button>
		<Button onclick={addSelectedPositions} disabled={selectedPositions.size === 0}>
			Add {selectedPositions.size}
			{selectedPositions.size === 1 ? 'position' : 'positions'}
		</Button>
	{/snippet}
</Modal>

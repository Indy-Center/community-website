<script lang="ts">
	import { enhance } from '$app/forms';
	import {
		Alert,
		Badge,
		Button,
		EmptyState,
		ErrorPage,
		Field,
		Heading,
		Icon,
		Modal,
		Panel,
		Position,
		Text,
		Textarea,
		Time
	} from '@indy-center/centerline-svelte';
	import {
		mdiAccountGroup,
		mdiBullhornOutline,
		mdiClose,
		mdiPencil,
		mdiPlus,
		mdiPublish,
		mdiPublishOff,
		mdiTextLong
	} from '@mdi/js';
	import ImageWithFallback from '$lib/components/ui/ImageWithFallback.svelte';
	import EventDetailsPanel from '$lib/components/events/EventDetailsPanel.svelte';
	import AddToCalendarDropdown from '$lib/components/events/AddToCalendarDropdown.svelte';
	import DeleteButton from '$lib/components/forms/DeleteButton.svelte';
	import BriefingModal from '$lib/components/events/BriefingModal.svelte';
	import BookingProblems from '$lib/components/events/BookingProblems.svelte';
	import { canManageEvents, isEventSignupProhibited } from '$lib/utils/permissions.js';
	import { isSignUpClosed } from '$lib/utils/events.js';
	import { LONG_EVENT_HOURS, longEventHours, supportsRosters } from '$lib/config/events';
	import type { VnasFacilityPosition } from '$lib/types/vnas.js';

	const { data } = $props();
	const { event, artccInformation, user, userId } = data;

	let requestOpen = $state(false);
	let briefingOpen = $state(false);
	// Managers are warned of an event so long its times may be mistyped
	const longHours = $derived(longEventHours(event.startTime, event.endTime));

	// Check if user has controller membership (for position sign-ups)
	const hasControllerAccess = $derived(user?.membership === 'controller');

	// Check if user is prohibited from signing up
	const isSignupProhibited = $derived(isEventSignupProhibited(data?.roles));

	/**
	 * Position sorting puts the positions in order of Approach > Tower > Ground > Delivery > Ramp/Other
	 * @param positions
	 */
	function sortPositions(positions: VnasFacilityPosition[] = []) {
		// Sorting positions by type and callsign
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

	// The load works the name out (memberName), honouring VATUSA name privacy
	const getUserDisplayName = (user: { name: string }) => user.name;

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
		const sortedGroups = Object.values(groups).map((group) => ({
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

	function userAlreadyAssignedToPosition(userId: string) {
		return event.positions.some((p) => p.userId === userId);
	}
</script>

<svelte:head>
	<title>{event?.name || 'Event'} | Indy Center</title>
</svelte:head>

{#if event}
	{@const hasRoster = supportsRosters(event.type) && event.rosterType !== 'none'}
	<!-- The title and its status on one line, the actions on their own below, so many actions never squeeze the title -->
	<div class="mb-8 flex flex-col gap-4">
		<div class="flex flex-wrap items-center gap-3">
			<Heading level={1}>{event.name}</Heading>
			{#if canManageEvents(data?.roles)}
				<!-- The event's state for staff, in words and colour; the button beside changes it -->
				<Badge variant={event.isPublished ? 'green' : 'yellow'} pill>
					{event.isPublished ? 'Published' : 'Draft'}
				</Badge>
			{/if}
		</div>
		<div class="flex shrink-0 flex-wrap gap-2">
			<AddToCalendarDropdown {event} />
			{#if canManageEvents(data?.roles)}
				<form method="POST" action="?/togglePublish">
					<Button type="submit" variant="secondary">
						<Icon path={event.isPublished ? mdiPublishOff : mdiPublish} />
						{event.isPublished ? 'Move to draft' : 'Publish'}
					</Button>
				</form>
				{#if hasRoster}
					<Button variant="secondary" href="/events/{event.id}/positions">
						<Icon path={mdiAccountGroup} />
						Edit positions
					</Button>
					<!-- An ended event's post stays as it was, and its role is deleted -->
					{#if data.briefing && event.endTime > new Date()}
						<Button variant="secondary" onclick={() => (briefingOpen = true)}>
							<Icon path={mdiBullhornOutline} />
							{data.briefing.sent ? 'Update briefing' : 'Send briefing'}
						</Button>
					{/if}
				{/if}
				<Button variant="secondary" href="/events/{event.id}/edit">
					<Icon path={mdiPencil} />
					Edit event
				</Button>
				<DeleteButton what="this event" />
			{/if}
		</div>
	</div>

	{#if canManageEvents(data?.roles) && (longHours || data.bookingProblems.length > 0)}
		<div class="mb-8 flex flex-col gap-4">
			{#if longHours}
				<Alert level="caution" title="This event runs {longHours} hours">
					That's more than {LONG_EVENT_HOURS} hours. Check its start and end times.
				</Alert>
			{/if}
			<BookingProblems problems={data.bookingProblems} dismissAction="?/dismissBookingProblems" />
		</div>
	{/if}

	<div class="mb-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
		<div class="overflow-hidden rounded-lg border border-border bg-card">
			<ImageWithFallback
				src={event.bannerUrl}
				alt="{event.name} banner"
				class="h-64 w-full object-cover sm:h-80 lg:h-full"
				fallbackClass="h-64 w-full sm:h-80 lg:h-full"
			/>
		</div>
		<EventDetailsPanel {event} />
	</div>

	<div class="grid grid-cols-1 gap-8 {hasRoster ? 'lg:grid-cols-2' : ''}">
		<Panel title="Event details" level={2}>
			{#snippet icon()}<Icon path={mdiTextLong} />{/snippet}
			<p class="whitespace-pre-line">{event.description}</p>
		</Panel>

		{#if hasRoster}
			<Panel title="Event positions" level={2} flush>
				{#snippet icon()}<Icon path={mdiAccountGroup} />{/snippet}
				{#if event.isRosterPublished}
					{#if event.positions && event.positions.length > 0}
						<div class="flex flex-col gap-6 p-4">
							{#each groupPositionsByFacility(event.positions) as facilityGroup (facilityGroup.facilityName)}
								<section>
									<Heading level={3} look="label" class="mb-2 border-b border-border pb-2">
										{facilityGroup.facilityName}
									</Heading>
									<ul class="flex flex-col gap-2">
										{#each facilityGroup.positions as position (position.position)}
											{@const info = getPositionInfo(position.position)}
											<li
												class="flex items-center justify-between gap-3 rounded-lg bg-muted px-4 py-3"
											>
												<Position
													class="min-w-0"
													callsign={info?.defaultCallsign || info?.callsign || position.position}
													positionId={position.position}
												/>
												<div class="flex shrink-0 items-center gap-2">
													{#if position.user}
														<span class="font-medium text-foreground">
															{getUserDisplayName(position.user)}
														</span>
														{#if !isSignUpClosed(event) && hasControllerAccess && event.rosterType === 'open' && position.userId === userId}
															<form
																method="POST"
																action="?/unassignFromPosition"
																use:enhance={() =>
																	async ({ result }) => {
																		if (result.type === 'success') window.location.reload();
																	}}
															>
																<input type="hidden" name="position" value={position.position} />
																<Button
																	type="submit"
																	variant="danger"
																	size="sm"
																	aria-label="Leave this position"
																>
																	<Icon path={mdiClose} />
																</Button>
															</form>
														{/if}
													{:else if hasControllerAccess && !isSignupProhibited && event.rosterType === 'open' && !isSignUpClosed(event) && !userAlreadyAssignedToPosition(user?.id)}
														<form
															method="POST"
															action="?/signUpForPosition"
															use:enhance={() =>
																async ({ result }) => {
																	if (result.type === 'success') window.location.reload();
																}}
														>
															<input type="hidden" name="position" value={position.position} />
															<Button type="submit" size="sm">
																<Icon path={mdiPlus} />
																Sign up
															</Button>
														</form>
													{:else}
														<Text as="span" tone="muted">Unassigned</Text>
													{/if}
												</div>
											</li>
										{/each}
									</ul>
								</section>
							{/each}
						</div>
					{:else}
						<EmptyState size="inline" class="p-4">
							No positions are set up for this event.
						</EmptyState>
					{/if}
				{:else if event.rosterType === 'assigned'}
					{#if hasControllerAccess}
						<div class="p-4">
							{#if event.positionRequests && event.positionRequests.some((req) => req.userId === userId)}
								<Alert level="info" title="Request submitted">
									You've asked for a position at this event. Event staff will assign the roster.
								</Alert>
							{:else}
								<Heading level={3} look={4}>Position requests</Heading>
								<Text class="mt-1 mb-4">Ask to be assigned a position for this event.</Text>
								<Button onclick={() => (requestOpen = true)}>
									<Icon path={mdiPlus} />
									Request a position
								</Button>
							{/if}
						</div>

						{#if event.positionRequests && event.positionRequests.length > 0}
							<div class="border-t border-border">
								<Heading level={3} look="label" class="px-4 pt-3 pb-1">Current requests</Heading>
								<ul class="divide-y divide-border">
									{#each event.positionRequests as request (request.userId)}
										<li class="flex items-start justify-between gap-3 px-4 py-3">
											<div>
												<span class="font-medium text-foreground">
													{getUserDisplayName(request.user)}
												</span>
												{#if request.user.operatingInitials}
													<span class="font-mono text-muted-foreground">
														({request.user.operatingInitials})
													</span>
												{/if}
												<Text size="small" class="mt-1">
													{request.comments || 'No comments'}
												</Text>
											</div>
											{#if request.createdAt}
												<Text as="span" size="small" class="shrink-0">
													<Time value={request.createdAt} show="datetime" />
												</Text>
											{/if}
										</li>
									{/each}
								</ul>
							</div>
						{/if}
					{:else}
						<EmptyState size="inline" class="p-4">
							Position requests are for controllers only.
						</EmptyState>
					{/if}
				{:else}
					<EmptyState size="inline" class="p-4">The roster isn't released yet.</EmptyState>
				{/if}
			</Panel>
		{/if}
	</div>
{:else}
	<ErrorPage status={404} message="Event not found" path="/events" home="/events" />
{/if}

{#if data.briefing}
	<BriefingModal briefing={data.briefing} bind:open={briefingOpen} />
{/if}

<Modal title="Request a position" bind:open={requestOpen}>
	<form
		id="request-position"
		method="POST"
		action="?/requestPosition"
		use:enhance={() =>
			async ({ result }) => {
				if (result.type === 'success') {
					requestOpen = false;
					window.location.reload();
				}
			}}
	>
		<Field
			label="Comments"
			hint="Your experience, the positions you'd like, or when you're available."
		>
			{#snippet children(control)}
				<Textarea {...control} name="comments" rows={4} />
			{/snippet}
		</Field>
	</form>
	{#snippet actions()}
		<Button variant="secondary" onclick={() => (requestOpen = false)}>Cancel</Button>
		<Button type="submit" form="request-position">
			<Icon path={mdiPlus} />
			Submit request
		</Button>
	{/snippet}
</Modal>

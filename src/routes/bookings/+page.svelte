<script lang="ts">
	import { enhance as formEnhance } from '$app/forms';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { format } from 'date-fns';
	import { superForm } from 'sveltekit-superforms';
	import {
		Alert,
		Badge,
		Button,
		confirmAction,
		DateTimeInput,
		Disclosure,
		EmptyState,
		Field,
		getPositions,
		Icon,
		Link,
		Modal,
		PageHeader,
		Panel,
		Position,
		setTimeZone,
		Text,
		Time,
		TimeZoneLine,
		toast
	} from '@indy-center/centerline-svelte';
	import {
		mdiCalendarClock,
		mdiCalendarMonth,
		mdiCalendarWeek,
		mdiFormatListBulleted,
		mdiLogin,
		mdiPencilOutline,
		mdiPlus,
		mdiTrashCanOutline
	} from '@mdi/js';
	import BookingCalendar from '$lib/components/bookings/BookingCalendar.svelte';
	import BookingMonth from '$lib/components/bookings/BookingMonth.svelte';
	import BookingLegend from '$lib/components/bookings/BookingLegend.svelte';
	import { bookingTypeVariant } from '$lib/components/bookings/bookingTypes';
	import PositionPicker from '$lib/components/bookings/PositionPicker.svelte';
	import ControllerSearch from '$lib/components/feedback/ControllerSearch.svelte';
	import {
		bookingDay,
		findControllerConflict,
		getBookedPositions,
		groupEventBookings,
		inZone,
		notEnded,
		parseBookingTime,
		positionCount
	} from '$lib/utils/bookings';
	import { positionText } from '$lib/positionText';
	import { signInHref } from '$lib/utils/signIn';
	import type { AtcBooking, CmsPosition } from '$lib/types/bookings';

	let { data } = $props();

	// Centerline's shared time-zone setting, for this page only until community moves onto
	// Centerline's app shell: every <Time> below follows the member's choice, and the calendars
	// are laid out in the same zone. Undefined means Zulu.
	const timeZone = setTimeZone(() => data.timeZone);
	let mounted = $state(false);
	onMount(() => {
		timeZone.mount();
		mounted = true;
	});
	const zone = $derived(timeZone.zone(mounted));

	let createOpen = $state(false);
	// Starts off each time the form opens, so people see the primary positions first
	let showAllPositions = $state(false);

	function openCreate() {
		showAllPositions = false;
		createOpen = true;
	}
	let updateOpen = $state(false);
	let editing: AtcBooking | undefined = $state();
	let deleteError: string | undefined = $state();
	let view: 'calendar' | 'month' | 'list' = $state('calendar');

	// What the last change did, as the server worded it
	const notify = (message: unknown) => {
		if (typeof message === 'string' && message) toast('success', message);
	};

	const {
		form: createForm,
		errors: createErrors,
		enhance: createEnhance
	} = superForm(data.createForm, {
		resetForm: true,
		onUpdated: ({ form }) => {
			if (form.valid) {
				notify(form.message);
				createOpen = false;
			}
		}
	});

	const {
		form: updateForm,
		errors: updateErrors,
		enhance: updateEnhance
	} = superForm(data.updateForm, {
		onUpdated: ({ form }) => {
			if (form.valid) {
				notify(form.message);
				updateOpen = false;
			}
		}
	});

	// Each event shows as one block, opened to list its positions
	const displayBookings = $derived(groupEventBookings(data.bookings, data.eventNames));

	// The list's days, without bookings that have ended (Week and Month still show them). Bookings
	// arrive sorted by start, so days (the member's) come out in order.
	const days = $derived(
		notEnded(displayBookings, new Date()).reduce<Map<string, AtcBooking[]>>((groups, booking) => {
			const day = bookingDay(booking, zone);
			groups.set(day, [...(groups.get(day) ?? []), booking]);
			return groups;
		}, new Map())
	);

	const canBook = $derived(
		data.canBook && data.bookingEnabled && data.bookablePositions.length > 0
	);

	// The chosen times, once both are set and in order. DateTimeInput holds the moment entered.
	const chosenTimes = $derived.by(() => {
		const start = new Date($createForm.start as unknown as string);
		const end = new Date($createForm.end as unknown as string);
		return !isNaN(start.getTime()) && !isNaN(end.getTime()) && end > start ? { start, end } : null;
	});
	const bookedPositions = $derived(
		chosenTimes
			? getBookedPositions(data.bookings, chosenTimes.start, chosenTimes.end)
			: new Map<string, AtcBooking>()
	);
	const selectedConflict = $derived(bookedPositions.get($createForm.callsign));
	// The booker (the student, for a mentor's training booking) already booked elsewhere then
	const bookerConflict = $derived.by(() => {
		const cid = $createForm.forCid || data.user?.cid;
		return chosenTimes && cid
			? findControllerConflict(data.bookings, cid, chosenTimes.start, chosenTimes.end)
			: undefined;
	});

	// The list's day headings, in the member's zone
	const dayTitle = (bookings: AtcBooking[]) =>
		format(inZone(parseBookingTime(bookings[0].start), zone), 'EEEE, MMMM d');

	let groupOpen = $state(false);
	let openedGroup: AtcBooking | undefined = $state();

	function openGroup(booking: AtcBooking) {
		openedGroup = booking;
		groupOpen = true;
	}

	function openEdit(booking: AtcBooking) {
		editing = booking;
		// The form holds the UTC ISO strings that DateTimeInput submits
		$updateForm.externalId = booking.externalId ?? '';
		$updateForm.start = parseBookingTime(booking.start).toISOString() as never;
		$updateForm.end = parseBookingTime(booking.end).toISOString() as never;
		updateOpen = true;
	}

	// A position in words, where <Position> can't go: confirm dialogs, aria-labels, titles
	const catalogue = getPositions<CmsPosition>();
	const positionOf = (booking: AtcBooking) => positionText(booking.callsign, catalogue());

	const confirmDelete =
		(booking: AtcBooking): SubmitFunction =>
		async ({ cancel }) => {
			const confirmed = await confirmAction({
				title: `Delete the ${positionOf(booking)} booking?`,
				message: 'It comes off the booking system and the calendars.',
				confirmLabel: 'Delete booking',
				danger: true
			});
			if (!confirmed) cancel();
			return async ({ result, update }) => {
				deleteError =
					result.type === 'failure'
						? ((result.data?.message as string) ?? 'The booking could not be deleted.')
						: undefined;
				if (result.type === 'success') {
					notify(result.data?.message);
					updateOpen = false;
				}
				await update();
			};
		};

	const VIEWS = [
		{ key: 'calendar', label: 'Week', icon: mdiCalendarWeek },
		{ key: 'month', label: 'Month', icon: mdiCalendarMonth },
		{ key: 'list', label: 'List', icon: mdiFormatListBulleted }
	] as const;
</script>

<svelte:head>
	<title>Bookings | Indy Center</title>
</svelte:head>

<PageHeader title="Bookings" class="mb-6">
	Upcoming controller bookings at Indy Center.
	{#snippet actions()}
		{#if canBook}
			<Button onclick={openCreate}>
				<Icon path={mdiPlus} />
				Book a position
			</Button>
		{/if}
	{/snippet}
</PageHeader>

<!-- One controller on an event's position, as the event page lists them: the radio name with the
     sector beneath, and who holds it on one line beside -->
{#snippet eventMember(member: AtcBooking)}
	<li class="flex items-center justify-between gap-4 py-2.5">
		<Position class="min-w-0" callsign={member.callsign} show={['radioName', 'name']} />
		<span class="shrink-0 text-right font-medium whitespace-nowrap text-foreground">
			{data.names[member.cid] ?? member.cid}
		</span>
	</li>
{/snippet}

{#if !data.loggedIn}
	<EmptyState title="Sign in to see bookings" level={2}>
		{#snippet icon()}<Icon path={mdiCalendarClock} />{/snippet}
		Bookings are for Indy Center members. Sign in with your VATSIM account to see them.
		{#snippet action()}
			<Button href={signInHref(page.url.pathname)}>
				<Icon path={mdiLogin} />
				Sign in with VATSIM
			</Button>
		{/snippet}
	</EmptyState>
{:else}
	{#if deleteError}
		<Alert level="danger" class="mb-6" dismissible ondismiss={() => (deleteError = undefined)}>
			{deleteError}
		</Alert>
	{/if}

	<div class="mb-3 flex flex-wrap items-end justify-between gap-3">
		<TimeZoneLine />
		<div class="flex gap-1" role="group" aria-label="View">
			{#each VIEWS as option (option.key)}
				<Button
					variant="secondary"
					size="sm"
					pressed={view === option.key}
					onclick={() => (view = option.key)}
				>
					<Icon path={option.icon} />
					{option.label}
				</Button>
			{/each}
		</div>
	</div>

	<!-- The calendars show a booking's type by colour alone; the list names it on a badge -->
	{#if view !== 'list'}
		<BookingLegend class="mb-3" />
	{/if}

	{#if view === 'calendar'}
		<BookingCalendar
			bookings={displayBookings}
			onOpenGroup={openGroup}
			names={data.names}
			manageable={data.manageable}
			onEdit={data.bookingEnabled ? openEdit : undefined}
			{zone}
		/>
	{:else if view === 'month'}
		<BookingMonth
			bookings={displayBookings}
			onOpenGroup={openGroup}
			names={data.names}
			manageable={data.manageable}
			onEdit={data.bookingEnabled ? openEdit : undefined}
			{zone}
		/>
	{:else}
		<div class="mx-auto flex max-w-4xl flex-col gap-6">
			{#each days as [day, bookings] (day)}
				<Panel title={dayTitle(bookings)} level={2} flush>
					{#snippet icon()}<Icon path={mdiCalendarClock} />{/snippet}
					<ul class="divide-y divide-border">
						{#each bookings as booking (booking.externalId ?? booking.id)}
							{#if booking.group}
								<li class="px-4 py-3">
									<Disclosure>
										{#snippet summary()}
											<span class="flex w-full items-center justify-between gap-4 text-sm">
												<span class="flex min-w-0 items-center gap-3">
													<span class="truncate font-semibold text-foreground">
														{booking.group?.name}
													</span>
													<Badge variant="purple" size="sm">event</Badge>
													<span class="shrink-0 text-muted-foreground">
														{positionCount(booking.group?.members.length ?? 0)}
													</span>
												</span>
												<span class="shrink-0 text-foreground">
													<Time
														value={parseBookingTime(booking.start)}
														end={parseBookingTime(booking.end)}
														zone="both"
													/>
												</span>
											</span>
										{/snippet}
										<ul class="divide-y divide-border text-sm">
											{#each booking.group.members as member (member.externalId)}
												{@render eventMember(member)}
											{/each}
										</ul>
										<p class="mt-3 text-sm">
											<Link href="/events/{booking.group.eventId}">{booking.group.name}</Link>
										</p>
									</Disclosure>
								</li>
							{:else}
								<!-- Fixed columns so names and times line up across rows; actions keep their width even when empty -->
								<li
									class="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-4 py-3 sm:grid-cols-[16rem_1fr_auto_5rem]"
								>
									<div class="flex min-w-0 items-center gap-3">
										<Position class="min-w-0" callsign={booking.callsign} />
										{#if booking.type !== 'booking'}
											<Badge variant={bookingTypeVariant[booking.type]} size="sm"
												>{booking.type}</Badge
											>
										{/if}
									</div>
									<span class="truncate text-right text-sm sm:text-left">
										{#if data.names[booking.cid]}
											<Link href="/profile/{booking.cid}">{data.names[booking.cid]}</Link>
										{:else}
											<span class="font-mono text-muted-foreground">{booking.cid}</span>
										{/if}
									</span>
									<span class="text-sm text-foreground">
										<Time
											value={parseBookingTime(booking.start)}
											end={parseBookingTime(booking.end)}
											zone="both"
										/>
									</span>
									<div class="flex items-center justify-end gap-1">
										{#if data.bookingEnabled && booking.externalId !== null && data.manageable.includes(booking.externalId)}
											<Button
												variant="secondary"
												size="sm"
												onclick={() => openEdit(booking)}
												aria-label="Edit {positionOf(booking)} booking"
											>
												<Icon path={mdiPencilOutline} />
											</Button>
											<form
												method="POST"
												action="?/delete"
												use:formEnhance={confirmDelete(booking)}
											>
												<input type="hidden" name="externalId" value={booking.externalId} />
												<Button
													type="submit"
													variant="danger"
													size="sm"
													aria-label="Delete {positionOf(booking)} booking"
												>
													<Icon path={mdiTrashCanOutline} />
												</Button>
											</form>
										{/if}
									</div>
								</li>
							{/if}
						{/each}
					</ul>
				</Panel>
			{:else}
				<EmptyState title="No bookings" level={2}>
					{#snippet icon()}<Icon path={mdiCalendarClock} />{/snippet}
					No positions are booked right now.
				</EmptyState>
			{/each}
		</div>
	{/if}
{/if}

<!-- A booking's start or end, entered in the member's zone and sent as UTC by Centerline's
     DateTimeInput, into the form field of that name -->
{#snippet timeField(
	// Either booking form's store (method syntax, so both fit)
	form: { update(change: (values: Record<string, unknown>) => Record<string, unknown>): void },
	// The form's values, as the store holds them (a snippet can't subscribe itself)
	values: { start: unknown; end: unknown },
	errors: { start?: string[]; end?: string[] },
	name: 'start' | 'end',
	label: string
)}
	<Field {label} error={errors[name]?.join(' ')} required>
		{#snippet children(control)}
			<DateTimeInput
				{...control}
				{name}
				bind:value={
					() => (values[name] as string) || undefined,
					(value) => form.update(($f) => ({ ...$f, [name]: value ?? '' }))
				}
			/>
		{/snippet}
	</Field>
{/snippet}

<Modal title={openedGroup?.group?.name ?? 'Event'} bind:open={groupOpen}>
	{#if openedGroup?.group}
		<Text size="small" class="mb-3">
			{positionCount(openedGroup.group.members.length)},
			<Time
				value={parseBookingTime(openedGroup.start)}
				end={parseBookingTime(openedGroup.end)}
				show="datetime"
				zone="both"
			/>
		</Text>
		<ul class="max-h-[60vh] divide-y divide-border overflow-y-auto text-sm">
			{#each openedGroup.group.members as member (member.externalId)}
				{@render eventMember(member)}
			{/each}
		</ul>
	{/if}
	{#snippet actions()}
		{#if openedGroup?.group}
			<Button variant="secondary" href="/events/{openedGroup.group.eventId}">Go to the event</Button
			>
		{/if}
	{/snippet}
</Modal>

<Modal title="Book a position" bind:open={createOpen}>
	<form
		id="create-booking"
		method="POST"
		action="?/create"
		use:createEnhance
		class="flex flex-col gap-4"
	>
		{#if $createErrors._errors}
			<Alert level="danger">{$createErrors._errors.join(' ')}</Alert>
		{/if}
		{#if data.students.length > 0}
			<!-- Mentors only: book a training session for a student, on a position you hold -->
			<Field
				label="Book training for"
				hint={$createForm.forCid
					? "Posted as a training booking under the student's name."
					: 'Leave empty to book for yourself.'}
				error={$createErrors.forCid?.join(' ')}
			>
				{#snippet children(control)}
					<ControllerSearch
						{...control}
						name="forCid"
						users={data.students}
						bind:value={$createForm.forCid}
					/>
				{/snippet}
			</Field>
			{#if $createForm.forCid}
				<div>
					<Button variant="secondary" size="sm" onclick={() => ($createForm.forCid = '')}>
						Book for myself instead
					</Button>
				</div>
			{/if}
		{/if}
		<!-- Times come first so the picker can grey out positions already booked then -->
		{@render timeField(createForm, $createForm, $createErrors, 'start', 'Start')}
		{@render timeField(createForm, $createForm, $createErrors, 'end', 'End')}
		<PositionPicker
			bind:showAll={showAllPositions}
			positions={data.bookablePositions}
			bind:value={$createForm.callsign}
			error={$createErrors.callsign}
			booked={bookedPositions}
		/>
		{#if selectedConflict}
			<Alert level="caution">
				{positionOf(selectedConflict)} is already booked
				<Time
					value={parseBookingTime(selectedConflict.start)}
					end={parseBookingTime(selectedConflict.end)}
					zone="both"
				/>. Pick another position or change your times.
			</Alert>
		{/if}
		{#if bookerConflict}
			<Alert level="caution">
				{$createForm.forCid ? 'That member is' : "You're"} already booked on {positionOf(
					bookerConflict
				)}
				<Time
					value={parseBookingTime(bookerConflict.start)}
					end={parseBookingTime(bookerConflict.end)}
					zone="both"
				/>. Change the times, or cancel that booking first.
			</Alert>
		{/if}
	</form>
	{#snippet actions()}
		<Button variant="secondary" onclick={() => (createOpen = false)}>Cancel</Button>
		<Button type="submit" form="create-booking" disabled={!!selectedConflict || !!bookerConflict}>
			<Icon path={mdiPlus} />
			Book
		</Button>
	{/snippet}
</Modal>

<Modal title="Edit {editing ? positionOf(editing) : ''} booking" bind:open={updateOpen}>
	<form
		id="update-booking"
		method="POST"
		action="?/update"
		use:updateEnhance
		class="flex flex-col gap-4"
	>
		{#if $updateErrors._errors}
			<Alert level="danger">{$updateErrors._errors.join(' ')}</Alert>
		{/if}
		<input type="hidden" name="externalId" value={$updateForm.externalId} />
		{@render timeField(updateForm, $updateForm, $updateErrors, 'start', 'Start')}
		{@render timeField(updateForm, $updateForm, $updateErrors, 'end', 'End')}
	</form>
	{#if editing}
		<form
			id="delete-booking"
			method="POST"
			action="?/delete"
			use:formEnhance={confirmDelete(editing)}
		>
			<input type="hidden" name="externalId" value={editing.externalId} />
		</form>
	{/if}
	{#snippet actions()}
		{#if editing}
			<Button type="submit" form="delete-booking" variant="danger" class="mr-auto">
				<Icon path={mdiTrashCanOutline} />
				Delete booking
			</Button>
		{/if}
		<Button variant="secondary" onclick={() => (updateOpen = false)}>Cancel</Button>
		<Button type="submit" form="update-booking">Save</Button>
	{/snippet}
</Modal>

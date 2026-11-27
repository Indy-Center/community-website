<script lang="ts">
	import { enhance as formEnhance } from '$app/forms';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { format } from 'date-fns';
	import { superForm } from 'sveltekit-superforms';
	import Badge from '$lib/components/Badge.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import Panel from '$lib/components/Panel.svelte';
	import BookingCalendar from '$lib/components/bookings/BookingCalendar.svelte';
	import BookingMonth from '$lib/components/bookings/BookingMonth.svelte';
	import BookingLegend from '$lib/components/bookings/BookingLegend.svelte';
	import PositionPicker from '$lib/components/bookings/PositionPicker.svelte';
	import ControllerSearch from '$lib/components/feedback/ControllerSearch.svelte';
	import {
		DateTimeInput,
		Field,
		getPositions,
		Position,
		setTimeZone,
		Time,
		TimeZoneLine
	} from '@indy-center/centerline-svelte';
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
	import type { AtcBooking, BookingType, CmsPosition } from '$lib/types/bookings';
	import IconCalendarClock from '~icons/mdi/calendar-clock';
	import IconPlus from '~icons/mdi/plus';
	import IconPencil from '~icons/mdi/pencil-outline';
	import IconTrash from '~icons/mdi/trash-can-outline';
	import IconCalendarWeek from '~icons/mdi/calendar-week';
	import IconListBox from '~icons/mdi/format-list-bulleted';
	import IconCalendarMonth from '~icons/mdi/calendar-month';
	import IconAccount from '~icons/mdi/account';

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

	let createModal: Modal | undefined = $state();
	// Starts off each time the form opens, so people see the primary positions first
	let showAllPositions = $state(false);

	function openCreate() {
		showAllPositions = false;
		createModal?.open();
	}
	let updateModal: Modal | undefined = $state();
	let editing: AtcBooking | undefined = $state();
	let deleteError: string | undefined = $state();
	// What the last change did, as the server worded it
	let notice: string | undefined = $state();
	let view: 'calendar' | 'month' | 'list' = $state('calendar');

	const {
		form: createForm,
		errors: createErrors,
		enhance: createEnhance
	} = superForm(data.createForm, {
		resetForm: true,
		onUpdated: ({ form }) => {
			if (form.valid) {
				notice = form.message;
				createModal?.close();
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
				notice = form.message;
				updateModal?.close();
			}
		}
	});

	const typeColors: Record<BookingType, 'sky' | 'purple' | 'orange' | 'green'> = {
		booking: 'sky',
		event: 'purple',
		exam: 'orange',
		training: 'green'
	};

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

	let groupModal: Modal | undefined = $state();
	let openedGroup: AtcBooking | undefined = $state();

	function openGroup(booking: AtcBooking) {
		openedGroup = booking;
		groupModal?.open();
	}

	function openEdit(booking: AtcBooking) {
		editing = booking;
		// The form holds the UTC ISO strings that DateTimeInput submits
		$updateForm.externalId = booking.externalId ?? '';
		$updateForm.start = parseBookingTime(booking.start).toISOString() as never;
		$updateForm.end = parseBookingTime(booking.end).toISOString() as never;
		updateModal?.open();
	}

	// A position in words, where <Position> can't go: confirm dialogs, aria-labels, titles
	const catalogue = getPositions<CmsPosition>();
	const positionOf = (booking: AtcBooking) => positionText(booking.callsign, catalogue());

	const confirmDelete =
		(booking: AtcBooking): SubmitFunction =>
		({ cancel }) => {
			if (!confirm(`Delete the ${positionOf(booking)} booking?`)) cancel();
			return async ({ result, update }) => {
				deleteError =
					result.type === 'failure'
						? ((result.data?.message as string) ?? 'Failed to delete booking')
						: undefined;
				if (result.type === 'success') {
					notice = result.data?.message as string | undefined;
					updateModal?.close();
				}
				await update();
			};
		};

	const viewButton = (active: boolean) =>
		`inline-flex cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${active ? 'bg-sky-600/30 text-white' : 'text-slate-400 hover:text-white'}`;

	const primaryButton =
		'inline-flex cursor-pointer items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky-700';
	const cancelButton =
		'cursor-pointer rounded-lg bg-slate-600 px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700';
</script>

<svelte:head>
	<title>Indy Center | Bookings</title>
</svelte:head>

<div class="mb-8">
	<div class="flex items-center justify-between gap-3">
		<h1 class="text-3xl font-bold text-white">Bookings</h1>
		{#if canBook}
			<button type="button" onclick={openCreate} class="{primaryButton} shadow-lg">
				<IconPlus class="h-4 w-4" />
				Book a Position
			</button>
		{/if}
	</div>
	<div class="mt-2 flex flex-wrap items-center justify-between gap-3">
		<p class="text-gray-400">Upcoming controller bookings at Indy Center.</p>
		{#if data.loggedIn}
			<div class="inline-flex rounded-lg border border-slate-700/60 bg-slate-800/60 p-1">
				<button
					type="button"
					class={viewButton(view === 'calendar')}
					aria-pressed={view === 'calendar'}
					onclick={() => (view = 'calendar')}
				>
					<IconCalendarWeek class="h-4 w-4" />
					Week
				</button>
				<button
					type="button"
					class={viewButton(view === 'month')}
					aria-pressed={view === 'month'}
					onclick={() => (view = 'month')}
				>
					<IconCalendarMonth class="h-4 w-4" />
					Month
				</button>
				<button
					type="button"
					class={viewButton(view === 'list')}
					aria-pressed={view === 'list'}
					onclick={() => (view = 'list')}
				>
					<IconListBox class="h-4 w-4" />
					List
				</button>
			</div>
		{/if}
	</div>
</div>

<!-- One controller on an event's position, as the event page lists them: the radio name with the
     sector beneath, and who holds it on one line beside -->
{#snippet eventMember(member: AtcBooking)}
	<li class="flex items-center justify-between gap-4 py-2.5">
		<Position class="min-w-0" callsign={member.callsign} show={['radioName', 'name']} />
		<span class="shrink-0 text-right font-medium whitespace-nowrap text-slate-200">
			{data.names[member.cid] ?? member.cid}
		</span>
	</li>
{/snippet}

{#if !data.loggedIn}
	<div class="mx-auto flex w-fit items-center justify-center">
		<div
			class="flex flex-col items-center justify-center gap-4 overflow-hidden rounded-lg bg-slate-800/80 px-8 py-6 shadow-xl backdrop-blur-sm"
		>
			<div class="text-gray-400">You must connect your VATSIM account to see bookings.</div>
			<a
				href={`/login/connect?returnUrl=${encodeURIComponent(page.url.pathname)}`}
				class="flex w-fit cursor-pointer items-center justify-center space-x-2 rounded-lg border border-sky-500/30 bg-sky-600/40 px-4 py-3 text-sm font-medium text-white transition-colors duration-200 hover:border-sky-400/50 hover:bg-sky-500/50"
			>
				<IconAccount class="h-5 w-5" />
				<span>Connect VATSIM Account</span>
			</a>
		</div>
	</div>
{:else}
	{#if notice}
		<div
			class="mx-auto mb-6 max-w-4xl rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-200"
		>
			{notice}
		</div>
	{/if}

	{#if deleteError}
		<div
			class="mx-auto mb-6 max-w-4xl rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
		>
			{deleteError}
		</div>
	{/if}

	<TimeZoneLine class="mb-2" />

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
		<div class="mx-auto max-w-4xl space-y-6">
			{#each days as [day, bookings] (day)}
				<Panel title={dayTitle(bookings)} icon={IconCalendarClock}>
					<ul class="divide-y divide-slate-700/60">
						{#each bookings as booking (booking.externalId ?? booking.id)}
							{#if booking.group}
								<li class="px-4 py-3">
									<details>
										<summary class="flex cursor-pointer items-center justify-between gap-4 text-sm">
											<span class="flex min-w-0 items-center gap-3">
												<span class="truncate font-semibold text-white">{booking.group.name}</span>
												<Badge label="event" color="purple" size="sm" />
												<span class="shrink-0 text-slate-400">
													{positionCount(booking.group.members.length)}
												</span>
											</span>
											<Time
												class="shrink-0 text-white"
												value={parseBookingTime(booking.start)}
												end={parseBookingTime(booking.end)}
												zone="both"
											/>
										</summary>
										<ul class="mt-3 divide-y divide-slate-700/40 text-sm">
											{#each booking.group.members as member (member.externalId)}
												{@render eventMember(member)}
											{/each}
										</ul>
										<a
											href="/events/{booking.group.eventId}"
											class="mt-3 inline-block text-xs font-medium text-sky-400 hover:text-sky-300"
										>
											View event →
										</a>
									</details>
								</li>
							{:else}
								<!-- Fixed columns so names and times line up across rows; actions keep their width even when empty -->
								<li
									class="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-4 py-3 sm:grid-cols-[16rem_1fr_auto_3.5rem]"
								>
									<div class="flex min-w-0 items-center gap-3">
										<Position class="min-w-0" callsign={booking.callsign} />
										{#if booking.type !== 'booking'}
											<Badge label={booking.type} color={typeColors[booking.type]} size="sm" />
										{/if}
									</div>
									{#if data.names[booking.cid]}
										<a
											href="/profile/{booking.cid}"
											class="truncate text-right text-sm text-slate-300 hover:text-white sm:text-left"
										>
											{data.names[booking.cid]}
										</a>
									{:else}
										<span class="text-right text-sm text-slate-400 sm:text-left">{booking.cid}</span
										>
									{/if}
									<Time
										class="text-sm text-white"
										value={parseBookingTime(booking.start)}
										end={parseBookingTime(booking.end)}
										zone="both"
									/>
									<div class="flex items-center justify-end gap-3">
										{#if data.bookingEnabled && booking.externalId !== null && data.manageable.includes(booking.externalId)}
											<button
												type="button"
												onclick={() => openEdit(booking)}
												class="cursor-pointer text-slate-400 hover:text-white"
												aria-label="Edit {positionOf(booking)} booking"
											>
												<IconPencil class="h-4 w-4" />
											</button>
											<form
												method="POST"
												action="?/delete"
												use:formEnhance={confirmDelete(booking)}
											>
												<input type="hidden" name="externalId" value={booking.externalId} />
												<button
													type="submit"
													class="cursor-pointer text-slate-400 hover:text-red-400"
													aria-label="Delete {positionOf(booking)} booking"
												>
													<IconTrash class="h-4 w-4" />
												</button>
											</form>
										{/if}
									</div>
								</li>
							{/if}
						{/each}
					</ul>
				</Panel>
			{:else}
				<Panel title="No Bookings" icon={IconCalendarClock}>
					<div class="p-8">
						<p class="leading-relaxed text-slate-300">No positions are booked right now.</p>
					</div>
				</Panel>
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

<Modal title={openedGroup?.group?.name ?? 'Event'} bind:this={groupModal}>
	{#if openedGroup?.group}
		<div class="max-h-[70vh] w-[480px] max-w-[90vw] overflow-y-auto p-2">
			<p class="mb-3 text-sm text-slate-400">
				{positionCount(openedGroup.group.members.length)},
				<Time
					value={parseBookingTime(openedGroup.start)}
					end={parseBookingTime(openedGroup.end)}
					show="datetime"
					zone="both"
				/>
			</p>
			<ul class="divide-y divide-slate-700/60 text-sm">
				{#each openedGroup.group.members as member (member.externalId)}
					{@render eventMember(member)}
				{/each}
			</ul>
			<a
				href="/events/{openedGroup.group.eventId}"
				class="mt-4 inline-block text-sm font-medium text-sky-400 hover:text-sky-300"
			>
				View event →
			</a>
		</div>
	{/if}
</Modal>

<Modal title="Book a Position" bind:this={createModal}>
	<form
		method="POST"
		action="?/create"
		use:createEnhance
		class="max-h-[80vh] w-[560px] max-w-[90vw] space-y-4 overflow-y-auto p-2"
	>
		{#if $createErrors._errors}
			<p class="text-sm text-red-400">{$createErrors._errors.join(' ')}</p>
		{/if}
		{#if data.students.length > 0}
			<!-- Mentors only: book a training session for a student, on a position you hold -->
			<div>
				<label class="mb-2 block text-sm font-medium text-gray-300" for="forCid">
					Book training for
				</label>
				<ControllerSearch
					name="forCid"
					users={data.students}
					bind:value={$createForm.forCid}
					invalid={!!$createErrors.forCid}
				/>
				{#if $createErrors.forCid}
					<p class="mt-1 text-sm text-red-400">{$createErrors.forCid.join(' ')}</p>
				{/if}
				<p class="mt-1 text-xs text-slate-400">
					{#if $createForm.forCid}
						Posted as a training booking under the student's name.
						<button
							type="button"
							class="cursor-pointer text-sky-400 hover:text-sky-300"
							onclick={() => ($createForm.forCid = '')}
						>
							Book for myself instead
						</button>
					{:else}
						Leave empty to book for yourself.
					{/if}
				</p>
			</div>
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
			<p class="text-sm text-amber-300">
				{positionOf(selectedConflict)} is already booked
				<Time
					value={parseBookingTime(selectedConflict.start)}
					end={parseBookingTime(selectedConflict.end)}
					zone="both"
				/>. Pick another position or change your times.
			</p>
		{/if}
		{#if bookerConflict}
			<p class="text-sm text-amber-300">
				{$createForm.forCid ? 'That member is' : "You're"} already booked on {positionOf(
					bookerConflict
				)}
				<Time
					value={parseBookingTime(bookerConflict.start)}
					end={parseBookingTime(bookerConflict.end)}
					zone="both"
				/>. Change the times, or cancel that booking first.
			</p>
		{/if}
		<div class="flex justify-end gap-3">
			<button type="button" onclick={() => createModal?.close()} class={cancelButton}>
				Cancel
			</button>
			<button
				type="submit"
				class="{primaryButton} disabled:cursor-not-allowed disabled:opacity-50"
				disabled={!!selectedConflict || !!bookerConflict}
			>
				<IconPlus class="h-4 w-4" />
				Book
			</button>
		</div>
	</form>
</Modal>

<Modal title="Edit {editing ? positionOf(editing) : ''} Booking" bind:this={updateModal}>
	<form
		method="POST"
		action="?/update"
		use:updateEnhance
		class="w-[500px] max-w-[90vw] space-y-4 p-2"
	>
		{#if $updateErrors._errors}
			<p class="text-sm text-red-400">{$updateErrors._errors.join(' ')}</p>
		{/if}
		<input type="hidden" name="externalId" value={$updateForm.externalId} />
		{@render timeField(updateForm, $updateForm, $updateErrors, 'start', 'Start')}
		{@render timeField(updateForm, $updateForm, $updateErrors, 'end', 'End')}
		<div class="flex justify-end gap-3">
			<button type="button" onclick={() => updateModal?.close()} class={cancelButton}>
				Cancel
			</button>
			<button type="submit" class={primaryButton}>Save</button>
		</div>
	</form>
	{#if editing}
		<form
			method="POST"
			action="?/delete"
			use:formEnhance={confirmDelete(editing)}
			class="border-t border-slate-700 p-2 pt-4"
		>
			<input type="hidden" name="externalId" value={editing.externalId} />
			<button
				type="submit"
				class="inline-flex cursor-pointer items-center gap-2 text-sm text-red-400 hover:text-red-300"
			>
				<IconTrash class="h-4 w-4" />
				Delete booking
			</button>
		</form>
	{/if}
</Modal>

<script lang="ts">
	import { enhance as formEnhance } from '$app/forms';
	import { page } from '$app/state';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { format } from 'date-fns';
	import { utc } from '@date-fns/utc';
	import { superForm } from 'sveltekit-superforms';
	import Badge from '$lib/components/Badge.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import Panel from '$lib/components/Panel.svelte';
	import BookingCalendar from '$lib/components/bookings/BookingCalendar.svelte';
	import PositionPicker from '$lib/components/bookings/PositionPicker.svelte';
	import DateTimeInput from '$lib/components/forms/DateTimeInput.svelte';
	import {
		describePosition,
		formatZuluRange,
		getBookedPositions,
		parseBookingTime
	} from '$lib/utils/bookings';
	import type { AtcBooking, BookingType } from '$lib/types/bookings';
	import IconCalendarClock from '~icons/mdi/calendar-clock';
	import IconPlus from '~icons/mdi/plus';
	import IconPencil from '~icons/mdi/pencil-outline';
	import IconTrash from '~icons/mdi/trash-can-outline';
	import IconCalendarWeek from '~icons/mdi/calendar-week';
	import IconListBox from '~icons/mdi/format-list-bulleted';
	import IconAccount from '~icons/mdi/account';

	let { data } = $props();

	let createModal: Modal | undefined = $state();
	let updateModal: Modal | undefined = $state();
	let editing: AtcBooking | undefined = $state();
	let deleteError: string | undefined = $state();
	let view: 'calendar' | 'list' = $state('calendar');

	const {
		form: createForm,
		errors: createErrors,
		constraints: createConstraints,
		enhance: createEnhance
	} = superForm(data.createForm, {
		resetForm: true,
		onUpdated: ({ form }) => {
			if (form.valid) createModal?.close();
		}
	});

	const {
		form: updateForm,
		errors: updateErrors,
		constraints: updateConstraints,
		enhance: updateEnhance
	} = superForm(data.updateForm, {
		onUpdated: ({ form }) => {
			if (form.valid) updateModal?.close();
		}
	});

	const typeColors: Record<BookingType, 'sky' | 'purple' | 'orange' | 'green'> = {
		booking: 'sky',
		event: 'purple',
		exam: 'orange',
		training: 'green'
	};

	// Bookings arrive sorted by start, so days come out in order
	const days = $derived(
		data.bookings.reduce<Map<string, AtcBooking[]>>((groups, booking) => {
			const day = booking.start.slice(0, 10);
			groups.set(day, [...(groups.get(day) ?? []), booking]);
			return groups;
		}, new Map())
	);

	const canBook = $derived(
		data.canBook && data.bookingEnabled && data.bookablePositions.length > 0
	);

	// The form holds the UTC ISO strings that DateTimeInput writes
	const bookedPositions = $derived.by(() => {
		const start = new Date($createForm.start as unknown as string);
		const end = new Date($createForm.end as unknown as string);
		const valid = !isNaN(start.getTime()) && !isNaN(end.getTime()) && end > start;

		return valid ? getBookedPositions(data.bookings, start, end) : new Map<string, AtcBooking>();
	});
	const selectedConflict = $derived(bookedPositions.get($createForm.callsign));

	const zulu = (time: string) => format(utc(parseBookingTime(time)), 'HHmm') + 'z';

	function openEdit(booking: AtcBooking) {
		editing = booking;
		// The form holds the UTC ISO strings that DateTimeInput submits
		$updateForm.id = booking.id;
		$updateForm.start = parseBookingTime(booking.start).toISOString() as never;
		$updateForm.end = parseBookingTime(booking.end).toISOString() as never;
		updateModal?.open();
	}

	const positionOf = (booking: AtcBooking) =>
		describePosition(booking.callsign, data.positions[booking.callsign]);

	const confirmDelete =
		(booking: AtcBooking): SubmitFunction =>
		({ cancel }) => {
			if (!confirm(`Delete the ${positionOf(booking)} booking?`)) cancel();
			return async ({ result, update }) => {
				deleteError =
					result.type === 'failure'
						? ((result.data?.message as string) ?? 'Failed to delete booking')
						: undefined;
				if (result.type === 'success') updateModal?.close();
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
			<button type="button" onclick={() => createModal?.open()} class="{primaryButton} shadow-lg">
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
					Calendar
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
	{#if deleteError}
		<div
			class="mx-auto mb-6 max-w-4xl rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
		>
			{deleteError}
		</div>
	{/if}

	{#if view === 'calendar'}
		<BookingCalendar
			bookings={data.bookings}
			names={data.names}
			positions={data.positions}
			manageableIds={data.manageableIds}
			onEdit={data.bookingEnabled ? openEdit : undefined}
		/>
	{:else}
		<div class="mx-auto max-w-4xl space-y-6">
			{#each days as [day, bookings] (day)}
				<Panel
					title={format(utc(parseBookingTime(`${day} 00:00:00`)), 'EEEE, MMMM d')}
					icon={IconCalendarClock}
				>
					<ul class="divide-y divide-slate-700/60">
						{#each bookings as booking (booking.id)}
							{@const label = data.positions[booking.callsign]}
							<!-- Fixed columns so names and times line up across rows; actions keep their width even when empty -->
							<li
								class="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-4 py-3 sm:grid-cols-[13rem_1fr_auto_3.5rem]"
							>
								<div class="flex min-w-0 items-center gap-3">
									<div class="min-w-0" title={booking.callsign}>
										{#if label}
											<div class="truncate font-semibold text-white">{label.title}</div>
											{#if label.detail}
												<div class="truncate text-sm text-slate-400">{label.detail}</div>
											{/if}
										{:else}
											<span class="font-mono font-semibold text-white">{booking.callsign}</span>
										{/if}
									</div>
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
									<span class="text-right text-sm text-slate-400 sm:text-left">{booking.cid}</span>
								{/if}
								<span class="font-mono text-sm text-white">
									{zulu(booking.start)} – {zulu(booking.end)}
								</span>
								<div class="flex items-center justify-end gap-3">
									{#if data.bookingEnabled && data.manageableIds.includes(booking.id)}
										<button
											type="button"
											onclick={() => openEdit(booking)}
											class="cursor-pointer text-slate-400 hover:text-white"
											aria-label="Edit {positionOf(booking)} booking"
										>
											<IconPencil class="h-4 w-4" />
										</button>
										<form method="POST" action="?/delete" use:formEnhance={confirmDelete(booking)}>
											<input type="hidden" name="id" value={booking.id} />
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
		<!-- Times come first so the picker can grey out positions already booked then -->
		<DateTimeInput
			form={createForm}
			errors={$createErrors}
			constraints={$createConstraints}
			fieldName="start"
			label="Start"
		/>
		<DateTimeInput
			form={createForm}
			errors={$createErrors}
			constraints={$createConstraints}
			fieldName="end"
			label="End"
		/>
		<PositionPicker
			positions={data.bookablePositions}
			bind:value={$createForm.callsign}
			error={$createErrors.callsign}
			booked={bookedPositions}
		/>
		{#if selectedConflict}
			<p class="text-sm text-amber-300">
				{positionOf(selectedConflict)} is already booked {formatZuluRange(selectedConflict)}. Pick
				another position or change your times.
			</p>
		{/if}
		<div class="flex justify-end gap-3">
			<button type="button" onclick={() => createModal?.close()} class={cancelButton}>
				Cancel
			</button>
			<button
				type="submit"
				class="{primaryButton} disabled:cursor-not-allowed disabled:opacity-50"
				disabled={!!selectedConflict}
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
		<input type="hidden" name="id" value={$updateForm.id} />
		<DateTimeInput
			form={updateForm}
			errors={$updateErrors}
			constraints={$updateConstraints}
			fieldName="start"
			label="Start"
		/>
		<DateTimeInput
			form={updateForm}
			errors={$updateErrors}
			constraints={$updateConstraints}
			fieldName="end"
			label="End"
		/>
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
			<input type="hidden" name="id" value={editing.id} />
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

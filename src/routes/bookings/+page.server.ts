import { redirect } from '@sveltejs/kit';
import { inArray } from 'drizzle-orm';
import { fail, message, superValidate, setError } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { vatsimControllersTable } from '$lib/db/schema/vatsimControllers';
import { memberName } from '$lib/members';
import { bookingSchema, bookingUpdateSchema } from '$lib/forms/bookings';
import { logger } from '$lib/server/logger';
import { readMemberCredentials } from '$lib/server/roster';
import { BOOKINGS_ADMIN_ONLY } from '$lib/config/bookings';
import { fetchEventNames } from '$lib/server/bookings';
import { BookingRefusedError } from '$lib/server/bookingsApi';
import type { AtcBooking, BookingsClient, CmsPosition } from '$lib/types/bookings';
import {
	EVENT_BOOKING_PREFIX,
	findBookingConflict,
	formatZuluRange,
	getBookablePositions,
	getPositionLabels,
	meetsRequirements,
	withSopRequirements,
	type BookablePosition,
	type PositionLabel
} from '$lib/utils/bookings';
import { isAdmin } from '$lib/utils/permissions';

// A controller's credentials from the roster copy, or null when they aren't on the roster or
// can't be read, in which case nothing is bookable
async function fetchQualifications(db: App.Locals['db'], cid: string | undefined) {
	if (!cid) return null;

	try {
		const { held } = await readMemberCredentials(db, cid);
		return held;
	} catch (error) {
		logger.error(`Failed to read credentials for ${cid}`, { error });
		return null;
	}
}

// The bookable positions from the CMS feed, with our SOP's requirements (the booking system checks
// only T2). When it can't be read nothing is bookable.
async function fetchPositions(client: BookingsClient | undefined) {
	if (!client) return [] as CmsPosition[];

	try {
		return withSopRequirements(await client.getPositions());
	} catch (error) {
		logger.error('Failed to read the bookable positions', { error });
		return [] as CmsPosition[];
	}
}

// The booking system's list. When it can't be read the page shows none, and booking is refused.
async function fetchBookings(client: BookingsClient) {
	try {
		return await client.listOrgBookings();
	} catch (error) {
		logger.error('Failed to read bookings', { error });
		return null;
	}
}

// Only bookings with our ID (made through this site) can be changed; the booking system addresses
// them by it
function canManageBooking(booking: AtcBooking, cid: string | undefined, roles: string[]) {
	return (
		booking.externalId !== null &&
		// An event booking follows its event's roster, so it is changed from the event
		!booking.externalId.startsWith(EVENT_BOOKING_PREFIX) &&
		(isAdmin(roles) || String(booking.cid) === cid)
	);
}

const UNAVAILABLE = 'Booking is not available right now. Please try again later.';

// What the booker is told when a write fails: the booking system's reason when it refused, else
// that it is unavailable
function writeFailure(error: unknown) {
	return error instanceof BookingRefusedError
		? { status: 400 as const, message: `The booking system refused: ${error.message}` }
		: { status: 502 as const, message: UNAVAILABLE };
}

// Only controllers on the ZID roster (home or visiting) can book
const isRostered = (user: App.Locals['user']) => user?.membership === 'controller';

// While BOOKINGS_ADMIN_ONLY is set, everyone but admins is sent home and every action refuses them
const ADMIN_ONLY = 'Bookings are open to admins only for now';
const shutOut = (roles: string[]) => BOOKINGS_ADMIN_ONLY && !isAdmin(roles);

export const load = async ({ locals }) => {
	if (shutOut(locals.roles)) redirect(302, '/');
	const client = locals.bookings;
	const [createForm, updateForm] = await Promise.all([
		superValidate(zod4(bookingSchema), { id: 'create-booking' }),
		superValidate(zod4(bookingUpdateSchema), { id: 'update-booking' })
	]);

	// Logged-out visitors get the connect prompt instead of the bookings
	if (!locals.user) {
		return {
			loggedIn: false,
			bookings: [] as AtcBooking[],
			eventNames: {} as Record<string, string>,
			names: {} as Record<string, string>,
			positions: {} as Record<string, PositionLabel>,
			bookablePositions: [] as BookablePosition[],
			manageable: [] as string[],
			canBook: false,
			bookingEnabled: false,
			createForm,
			updateForm
		};
	}

	const [listed, feed, qualifications] = await Promise.all([
		client ? fetchBookings(client) : null,
		fetchPositions(client),
		fetchQualifications(locals.db, locals.user.cid)
	]);
	const bookings = listed ?? [];

	const eventNames = await fetchEventNames(locals.db, bookings);

	// Labels for the booked positions only; one no longer in the feed falls back to its callsign
	const allLabels = getPositionLabels(feed);
	const positions = Object.fromEntries(
		bookings
			.filter((booking) => allLabels[booking.callsign])
			.map((booking) => [booking.callsign, allLabels[booking.callsign]])
	);
	// Without roster credentials nothing is bookable
	const bookablePositions =
		isRostered(locals.user) && qualifications
			? getBookablePositions(feed, qualifications.certification, qualifications.endorsements)
			: [];

	// Names depend on which CIDs booked, so this lookup has to follow the fetches above. The same
	// rule as the roster: a preferred name they chose, else first and last name, with a
	// privacy-flagged member's last name replaced by their CID. Anyone off the roster shows by CID.
	const cids = [...new Set(bookings.map((booking) => String(booking.cid)))];
	const members =
		cids.length > 0
			? await locals.db.query.vatsimControllersTable.findMany({
					where: inArray(vatsimControllersTable.cid, cids),
					columns: { cid: true, firstName: true, lastName: true, namePrivacy: true },
					with: { user: { columns: { preferredName: true } } }
				})
			: [];

	const names = Object.fromEntries(
		members.map((member) => [
			member.cid,
			memberName({ ...member, preferredName: member.user?.preferredName })
		])
	);

	const manageable = bookings
		.filter((booking) => canManageBooking(booking, locals.user?.cid, locals.roles))
		.flatMap((booking) => booking.externalId ?? []);

	return {
		loggedIn: true,
		bookings,
		eventNames,
		names,
		positions,
		bookablePositions,
		manageable,
		canBook: isRostered(locals.user),
		bookingEnabled: listed !== null,
		createForm,
		updateForm
	};
};

export const actions = {
	create: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(bookingSchema));
		if (!locals.user) return fail(401, { form });
		if (shutOut(locals.roles)) return setError(form, '', ADMIN_ONLY, { status: 403 });
		if (!isRostered(locals.user)) {
			return setError(form, '', 'Only rostered controllers can book positions', { status: 403 });
		}
		if (!form.valid) return fail(400, { form });

		const client = locals.bookings;
		if (!client) return setError(form, '', UNAVAILABLE, { status: 503 });

		const [feed, qualifications, bookings] = await Promise.all([
			fetchPositions(client),
			fetchQualifications(locals.db, locals.user.cid),
			fetchBookings(client)
		]);

		if (!bookings) return setError(form, '', UNAVAILABLE, { status: 503 });
		if (!qualifications) {
			return setError(form, '', "We couldn't verify your certifications right now", {
				status: 503
			});
		}

		const { callsign, start, end } = form.data;
		const position = feed.find((candidate) => candidate.callsign === callsign);
		const allowed =
			position !== undefined &&
			meetsRequirements(position, qualifications.certification, qualifications.endorsements);

		if (!allowed) return setError(form, 'callsign', "You aren't certified for this position");
		if (start < new Date()) return setError(form, 'start', 'Start time must be in the future');

		const conflict = findBookingConflict(bookings, callsign, start, end);
		if (conflict) {
			return setError(form, 'callsign', `Already booked ${formatZuluRange(conflict)}`);
		}

		// Our own ID for it: how it is updated and cancelled later
		const externalId = crypto.randomUUID();
		try {
			await client.createBooking({
				externalId,
				callsign,
				cid: Number(locals.user.cid),
				start,
				end
			});
		} catch (error) {
			logger.error(`Failed to book ${callsign} for ${locals.user.cid}`, { error });
			const { status, message: reason } = writeFailure(error);
			return setError(form, '', reason, { status });
		}

		logger.info(`User ${locals.user.cid} booked ${callsign}`, { externalId, start, end });
		return message(form, 'Booked.');
	},

	update: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(bookingUpdateSchema));
		if (!locals.user) return fail(401, { form });
		if (shutOut(locals.roles)) return setError(form, '', ADMIN_ONLY, { status: 403 });
		if (!form.valid) return fail(400, { form });

		const client = locals.bookings;
		const bookings = client ? await fetchBookings(client) : null;
		if (!client || !bookings) return setError(form, '', UNAVAILABLE, { status: 503 });

		const { externalId, start, end } = form.data;
		const booking = bookings.find((candidate) => candidate.externalId === externalId);

		if (!booking || !canManageBooking(booking, locals.user.cid, locals.roles)) {
			return setError(form, '', "You can't edit this booking", { status: 403 });
		}

		const conflict = findBookingConflict(bookings, booking.callsign, start, end, booking.id);
		if (conflict) {
			return setError(form, '', `This position is already booked ${formatZuluRange(conflict)}`);
		}

		try {
			await client.updateBooking({ externalId, start, end });
		} catch (error) {
			logger.error(`Failed to update booking ${externalId}`, { error });
			const { status, message: reason } = writeFailure(error);
			return setError(form, '', reason, { status });
		}

		logger.info(`User ${locals.user.cid} updated booking ${externalId} (${booking.callsign})`, {
			start,
			end
		});
		return message(form, 'Booking updated.');
	},

	delete: async ({ request, locals }) => {
		if (!locals.user) return fail(401);
		if (shutOut(locals.roles)) return fail(403, { message: ADMIN_ONLY });

		const client = locals.bookings;
		const bookings = client ? await fetchBookings(client) : null;
		if (!client || !bookings) return fail(503, { message: UNAVAILABLE });

		const externalId = String((await request.formData()).get('externalId') ?? '');
		const booking = bookings.find((candidate) => candidate.externalId === externalId);

		if (!booking || !canManageBooking(booking, locals.user.cid, locals.roles)) {
			return fail(403, { message: "You can't delete this booking" });
		}

		try {
			await client.cancelBooking({ externalId });
		} catch (error) {
			logger.error(`Failed to cancel booking ${externalId}`, { error });
			const { status, message: reason } = writeFailure(error);
			return fail(status, { message: reason });
		}

		logger.info(`User ${locals.user.cid} deleted booking ${externalId} (${booking.callsign})`);
		return { success: true, message: 'Booking deleted.' };
	}
};

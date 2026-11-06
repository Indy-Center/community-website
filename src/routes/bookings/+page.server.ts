import { inArray } from 'drizzle-orm';
import { fail, message, superValidate, setError } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { usersTable } from '$lib/db/schema/users';
import { bookingSchema, bookingUpdateSchema } from '$lib/forms/bookings';
import { logger } from '$lib/server/logger';
import { readMemberCredentials } from '$lib/server/roster';
import {
	cancelBooking,
	createBooking,
	fetchBookings,
	updateBooking
} from '$lib/server/bookings';
import { fetchArtccInformation } from '$lib/server/vatsim/vnasDataClient';
import type { AtcBooking } from '$lib/types/bookings';
import {
	canBookPosition,
	filterFacilityBookings,
	findBookingConflict,
	formatZuluRange,
	getBookablePositions,
	getCallsignPrefixes,
	getPositionLabels,
	type BookablePosition,
	type PositionLabel
} from '$lib/utils/bookings';
import { isAdmin } from '$lib/utils/permissions';

// A controller's credentials from the roster copy, or null when they aren't on the roster or
// can't be read, in which case nothing is bookable
async function fetchQualifications(db: App.Locals['db'], cid: string | undefined) {
	if (!cid) return null;

	try {
		const { held, credentials } = await readMemberCredentials(db, cid);
		return held ? { ...held, credentials } : null;
	} catch (error) {
		logger.error(`Failed to read credentials for ${cid}`, { error });
		return null;
	}
}

// Only bookings with our ID (made through this site) can be changed; the bookings Worker
// addresses them by it
function canManageBooking(booking: AtcBooking, cid: string | undefined, roles: string[]) {
	return booking.externalId !== null && (isAdmin(roles) || String(booking.cid) === cid);
}

const SUBMITTED = 'Submitted. It can take a minute for the calendar to catch up.';
const UNAVAILABLE = 'Booking is not available right now. Please try again later.';

// Only controllers on the ZID roster (home or visiting) can book
const isRostered = (user: App.Locals['user']) => user?.membership === 'controller';

export const load = async ({ locals, platform }) => {
	const worker = platform?.env.BOOKINGS;
	const [createForm, updateForm] = await Promise.all([
		superValidate(zod4(bookingSchema), { id: 'create-booking' }),
		superValidate(zod4(bookingUpdateSchema), { id: 'update-booking' })
	]);

	// Logged-out visitors get the connect prompt instead of the bookings
	if (!locals.user) {
		return {
			loggedIn: false,
			bookings: [] as AtcBooking[],
			names: {} as Record<string, string>,
			positions: {} as Record<string, PositionLabel>,
			bookablePositions: [] as BookablePosition[],
			manageableIds: [] as number[],
			canBook: false,
			bookingEnabled: false,
			createForm,
			updateForm
		};
	}

	const [allBookings, artcc, qualifications] = await Promise.all([
		worker ? fetchBookings(worker) : ([] as AtcBooking[]),
		fetchArtccInformation(),
		fetchQualifications(locals.db, locals.user.cid)
	]);

	const bookings = filterFacilityBookings(allBookings, getCallsignPrefixes(artcc.facility));
	// Labels for booked positions only; anything not in vNAS falls back to its callsign
	const allLabels = getPositionLabels(artcc.facility);
	const positions = Object.fromEntries(
		bookings
			.filter((booking) => allLabels[booking.callsign])
			.map((booking) => [booking.callsign, allLabels[booking.callsign]])
	);
	// Without roster credentials nothing is bookable
	const bookablePositions =
		isRostered(locals.user) && qualifications
			? getBookablePositions(artcc.facility).filter(({ callsign }) =>
					canBookPosition(
						callsign,
						qualifications.certification,
						qualifications.endorsements,
						qualifications.credentials
					)
				)
			: [];

	// Names depend on which CIDs booked, so this lookup has to follow the fetches above
	const cids = [...new Set(bookings.map((booking) => String(booking.cid)))];
	const users =
		cids.length > 0
			? await locals.db
					.select({
						cid: usersTable.cid,
						firstName: usersTable.firstName,
						lastName: usersTable.lastName,
						preferredName: usersTable.preferredName
					})
					.from(usersTable)
					.where(inArray(usersTable.cid, cids))
			: [];

	const names = Object.fromEntries(
		users.map((user) => [user.cid, user.preferredName || `${user.firstName} ${user.lastName}`])
	);

	const manageableIds = bookings
		.filter((booking) => canManageBooking(booking, locals.user?.cid, locals.roles))
		.map((booking) => booking.id);

	return {
		loggedIn: true,
		bookings,
		names,
		positions,
		bookablePositions,
		manageableIds,
		canBook: isRostered(locals.user),
		bookingEnabled: Boolean(worker),
		createForm,
		updateForm
	};
};

export const actions = {
	create: async ({ request, locals, platform }) => {
		const form = await superValidate(request, zod4(bookingSchema));
		if (!locals.user) return fail(401, { form });
		if (!isRostered(locals.user)) {
			return setError(form, '', 'Only rostered controllers can book positions', { status: 403 });
		}
		if (!form.valid) return fail(400, { form });

		const worker = platform?.env.BOOKINGS;
		if (!worker) return setError(form, '', UNAVAILABLE, { status: 503 });

		const [artcc, qualifications, bookings] = await Promise.all([
			fetchArtccInformation(),
			fetchQualifications(locals.db, locals.user.cid),
			fetchBookings(worker)
		]);

		if (!qualifications) {
			return setError(form, '', "We couldn't verify your certifications right now", {
				status: 503
			});
		}

		const { callsign, start, end } = form.data;
		const allowed =
			getBookablePositions(artcc.facility).some((position) => position.callsign === callsign) &&
			canBookPosition(
				callsign,
				qualifications.certification,
				qualifications.endorsements,
				qualifications.credentials
			);

		if (!allowed) return setError(form, 'callsign', "You aren't certified for this position");
		if (start < new Date()) return setError(form, 'start', 'Start time must be in the future');

		const conflict = findBookingConflict(bookings, callsign, start, end);
		if (conflict) {
			return setError(form, 'callsign', `Already booked ${formatZuluRange(conflict)}`);
		}

		try {
			const externalId = await createBooking(worker, {
				callsign,
				cid: Number(locals.user.cid),
				start,
				end
			});
			logger.info(`User ${locals.user.cid} booked ${callsign}`, { externalId, start, end });
		} catch (error) {
			logger.error(`Failed to queue ${callsign} booking for ${locals.user.cid}`, { error });
			return setError(form, '', UNAVAILABLE, { status: 502 });
		}

		return message(form, SUBMITTED);
	},

	update: async ({ request, locals, platform }) => {
		const form = await superValidate(request, zod4(bookingUpdateSchema));
		if (!locals.user) return fail(401, { form });
		if (!form.valid) return fail(400, { form });

		const worker = platform?.env.BOOKINGS;
		if (!worker) return setError(form, '', UNAVAILABLE, { status: 503 });

		const { externalId, start, end } = form.data;
		const bookings = await fetchBookings(worker);
		const booking = bookings.find((candidate) => candidate.externalId === externalId);

		if (!booking || !canManageBooking(booking, locals.user.cid, locals.roles)) {
			return setError(form, '', "You can't edit this booking", { status: 403 });
		}

		const conflict = findBookingConflict(bookings, booking.callsign, start, end, booking.id);
		if (conflict) {
			return setError(form, '', `This position is already booked ${formatZuluRange(conflict)}`);
		}

		try {
			await updateBooking(worker, externalId, { start, end });
		} catch (error) {
			logger.error(`Failed to queue update of booking ${externalId}`, { error });
			return setError(form, '', UNAVAILABLE, { status: 502 });
		}

		logger.info(`User ${locals.user.cid} updated booking ${externalId} (${booking.callsign})`, {
			start,
			end
		});
		return message(form, SUBMITTED);
	},

	delete: async ({ request, locals, platform }) => {
		if (!locals.user) return fail(401);

		const worker = platform?.env.BOOKINGS;
		if (!worker) return fail(503, { message: UNAVAILABLE });

		const externalId = String((await request.formData()).get('externalId') ?? '');
		const bookings = await fetchBookings(worker);
		const booking = bookings.find((candidate) => candidate.externalId === externalId);

		if (!booking || !canManageBooking(booking, locals.user.cid, locals.roles)) {
			return fail(403, { message: "You can't delete this booking" });
		}

		try {
			await cancelBooking(worker, externalId);
		} catch (error) {
			logger.error(`Failed to queue cancel of booking ${externalId}`, { error });
			return fail(502, { message: UNAVAILABLE });
		}

		logger.info(`User ${locals.user.cid} deleted booking ${externalId} (${booking.callsign})`);
		return { success: true, message: SUBMITTED };
	}
};

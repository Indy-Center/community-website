import { redirect } from '@sveltejs/kit';
import { eq, inArray } from 'drizzle-orm';
import { fail, message, superValidate, setError } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { vatsimControllersTable } from '$lib/db/schema/vatsimControllers';
import { memberName, type PickableShownMember } from '$lib/members';
import { bookingSchema, bookingUpdateSchema } from '$lib/forms/bookings';
import { logger } from '$lib/server/logger';
import { BOOKINGS_ADMIN_ONLY } from '$lib/config/bookings';
import { fetchEventNames } from '$lib/server/bookings';
import { BookingRefusedError } from '$lib/server/bookingsApi';
import type { AtcBooking, BookingsClient } from '$lib/types/bookings';
import {
	EVENT_BOOKING_PREFIX,
	findBookingConflict,
	formatZuluRange,
	getBookablePositions,
	isMentor,
	meetsRequirements,
	withSopRequirements,
	type BookablePosition
} from '$lib/utils/bookings';
import { isAdmin } from '$lib/utils/permissions';

// A controller's credentials and VATUSA roles from the roster copy, or null when they aren't on the
// roster or it can't be read, in which case nothing is bookable
async function fetchQualifications(db: App.Locals['db'], cid: string | undefined) {
	if (!cid) return null;

	try {
		const entry = await db.query.vatsimControllersTable.findFirst({
			where: eq(vatsimControllersTable.cid, cid),
			columns: { certification: true, endorsements: true, roles: true }
		});
		return entry ?? null;
	} catch (error) {
		logger.error(`Failed to read credentials for ${cid}`, { error });
		return null;
	}
}

// Who a mentor can book training for: every rostered controller but themselves, by CID (a student
// may never have signed in), named as everywhere else
async function fetchStudents(db: App.Locals['db'], mentorCid: string) {
	const rows = await db.query.vatsimControllersTable.findMany({
		columns: { cid: true, firstName: true, lastName: true, namePrivacy: true },
		with: { user: { columns: { preferredName: true, operatingInitials: true } } }
	});
	return rows
		.filter((row) => row.cid !== mentorCid)
		.map(
			(row): PickableShownMember => ({
				id: row.cid,
				cid: row.cid,
				name: memberName({ ...row, preferredName: row.user?.preferredName }),
				operatingInitials: row.user?.operatingInitials ?? null,
				vatsimName: row.namePrivacy ? null : `${row.firstName} ${row.lastName}`
			})
		)
		.sort((a, b) => a.name.localeCompare(b.name));
}

// The CMS catalogue's live positions, with our SOP's requirements (the booking system checks only
// T2). With no catalogue, nothing is bookable.
const fetchPositions = async (locals: App.Locals) =>
	withSopRequirements((await locals.positions()).filter((position) => !position.retired));

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
// them by it. Their owner and admins may, and mentors may change any training booking.
function canManageBooking(
	booking: AtcBooking,
	cid: string | undefined,
	roles: string[],
	mentor: boolean
) {
	return (
		booking.externalId !== null &&
		// An event booking follows its event's roster, so it is changed from the event
		!booking.externalId.startsWith(EVENT_BOOKING_PREFIX) &&
		(isAdmin(roles) || String(booking.cid) === cid || (mentor && booking.type === 'training'))
	);
}

// Whether this controller mentors: VATUSA's INS or MTR role, as the booking system is told
const mentors = (qualifications: { roles: string[] } | null) =>
	isMentor(qualifications?.roles ?? []);

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
			bookablePositions: [] as BookablePosition[],
			manageable: [] as string[],
			students: [] as PickableShownMember[],
			canBook: false,
			bookingEnabled: false,
			createForm,
			updateForm
		};
	}

	const [listed, feed, qualifications] = await Promise.all([
		client ? fetchBookings(client) : null,
		fetchPositions(locals),
		fetchQualifications(locals.db, locals.user.cid)
	]);
	const bookings = listed ?? [];

	const mentor = isRostered(locals.user) && mentors(qualifications);
	const [eventNames, students] = await Promise.all([
		fetchEventNames(locals.db, bookings),
		mentor ? fetchStudents(locals.db, locals.user.cid) : ([] as PickableShownMember[])
	]);

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
		.filter((booking) => canManageBooking(booking, locals.user?.cid, locals.roles, mentor))
		.flatMap((booking) => booking.externalId ?? []);

	return {
		loggedIn: true,
		bookings,
		eventNames,
		names,
		bookablePositions,
		manageable,
		// Mentors book training for these students; empty for everyone else
		students,
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
			fetchPositions(locals),
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
		// A mentor may book for a student, as training: the booking is the student's, on a position
		// the mentor is certified for, since the student is training on it
		const forCid =
			form.data.forCid && form.data.forCid !== locals.user.cid ? form.data.forCid : null;
		if (forCid) {
			if (!mentors(qualifications)) {
				return setError(form, 'forCid', 'Only mentors can book for another member', {
					status: 403
				});
			}
			const student = await locals.db.query.vatsimControllersTable.findFirst({
				where: eq(vatsimControllersTable.cid, forCid),
				columns: { cid: true }
			});
			if (!student) return setError(form, 'forCid', 'That member is not on the roster');
		}

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
				cid: Number(forCid ?? locals.user.cid),
				...(forCid ? { type: 'training' as const } : {}),
				start,
				end
			});
		} catch (error) {
			logger.error(`Failed to book ${callsign} for ${forCid ?? locals.user.cid}`, { error });
			const { status, message: reason } = writeFailure(error);
			return setError(form, '', reason, { status });
		}

		if (forCid) {
			logger.info(`Mentor ${locals.user.cid} booked ${callsign} training for ${forCid}`, {
				externalId,
				start,
				end
			});
			return message(form, 'Training booked.');
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
		const [bookings, qualifications] = await Promise.all([
			client ? fetchBookings(client) : null,
			fetchQualifications(locals.db, locals.user.cid)
		]);
		if (!client || !bookings) return setError(form, '', UNAVAILABLE, { status: 503 });

		const { externalId, start, end } = form.data;
		const booking = bookings.find((candidate) => candidate.externalId === externalId);
		const mentor = mentors(qualifications);

		if (!booking || !canManageBooking(booking, locals.user.cid, locals.roles, mentor)) {
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
		const [bookings, qualifications] = await Promise.all([
			client ? fetchBookings(client) : null,
			fetchQualifications(locals.db, locals.user.cid)
		]);
		if (!client || !bookings) return fail(503, { message: UNAVAILABLE });

		const externalId = String((await request.formData()).get('externalId') ?? '');
		const booking = bookings.find((candidate) => candidate.externalId === externalId);
		const mentor = mentors(qualifications);

		if (!booking || !canManageBooking(booking, locals.user.cid, locals.roles, mentor)) {
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

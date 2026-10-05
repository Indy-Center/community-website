import { eq, inArray } from 'drizzle-orm';
import { fail, superValidate, setError } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { userCertificationsTable } from '$lib/db/schema/certifications';
import { userEndorsementsTable } from '$lib/db/schema/endorsements';
import { usersTable } from '$lib/db/schema/users';
import { bookingSchema, bookingUpdateSchema } from '$lib/forms/bookings';
import { logger } from '$lib/server/logger';
import {
	createBooking,
	deleteBooking,
	fetchBooking,
	fetchBookings,
	hasBookingsApiKey,
	updateBooking
} from '$lib/server/vatsim/atcBookingsClient';
import { fetchArtccInformation } from '$lib/server/vatsim/vnasDataClient';
import type { Database } from '$lib/server/db';
import type { AtcBooking } from '$lib/types/bookings';
import {
	canBookPosition,
	filterFacilityBookings,
	findBookingConflict,
	formatBookingTime,
	formatZuluRange,
	getBookablePositions,
	getCallsignPrefixes,
	getPositionLabels,
	type BookablePosition,
	type PositionLabel
} from '$lib/utils/bookings';
import { isAdmin } from '$lib/utils/permissions';

async function fetchQualifications(db: Database, userId: string | undefined) {
	if (!userId) return { certification: null, endorsements: [] as string[] };

	const [certifications, endorsements] = await Promise.all([
		db
			.select({ certification: userCertificationsTable.certification })
			.from(userCertificationsTable)
			.where(eq(userCertificationsTable.userId, userId)),
		db
			.select({ endorsement: userEndorsementsTable.endorsement })
			.from(userEndorsementsTable)
			.where(eq(userEndorsementsTable.userId, userId))
	]);

	return {
		certification: certifications[0]?.certification ?? null,
		endorsements: endorsements.map((row) => row.endorsement)
	};
}

function canManageBooking(booking: AtcBooking, cid: string | undefined, roles: string[]) {
	return isAdmin(roles) || String(booking.cid) === cid;
}

// Only controllers on the ZID roster (home or visiting) can book
const isRostered = (user: App.Locals['user']) => user?.membership === 'controller';

export const load = async ({ locals }) => {
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
		fetchBookings(),
		fetchArtccInformation(),
		fetchQualifications(locals.db, locals.user.id)
	]);

	const bookings = filterFacilityBookings(allBookings, getCallsignPrefixes(artcc.facility));
	// Labels for booked positions only; anything not in vNAS falls back to its callsign
	const allLabels = getPositionLabels(artcc.facility);
	const positions = Object.fromEntries(
		bookings
			.filter((booking) => allLabels[booking.callsign])
			.map((booking) => [booking.callsign, allLabels[booking.callsign]])
	);
	const bookablePositions = isRostered(locals.user)
		? getBookablePositions(artcc.facility).filter(({ callsign }) =>
				canBookPosition(callsign, qualifications.certification, qualifications.endorsements)
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
		bookingEnabled: hasBookingsApiKey(),
		createForm,
		updateForm
	};
};

export const actions = {
	create: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(bookingSchema));
		if (!locals.user) return fail(401, { form });
		if (!isRostered(locals.user)) {
			return setError(form, '', 'Only rostered controllers can book positions', { status: 403 });
		}
		if (!form.valid) return fail(400, { form });

		const [artcc, qualifications, bookings] = await Promise.all([
			fetchArtccInformation(),
			fetchQualifications(locals.db, locals.user.id),
			fetchBookings()
		]);

		const { callsign, start, end } = form.data;
		const allowed =
			getBookablePositions(artcc.facility).some((position) => position.callsign === callsign) &&
			canBookPosition(callsign, qualifications.certification, qualifications.endorsements);

		if (!allowed) return setError(form, 'callsign', "You aren't certified for this position");
		if (start < new Date()) return setError(form, 'start', 'Start time must be in the future');

		const conflict = findBookingConflict(bookings, callsign, start, end);
		if (conflict) {
			return setError(form, 'callsign', `Already booked ${formatZuluRange(conflict)}`);
		}

		const result = await createBooking({
			callsign,
			cid: Number(locals.user.cid),
			start: formatBookingTime(start),
			end: formatBookingTime(end)
		});

		if (!result.ok) return setError(form, '', result.message, { status: result.status });

		logger.info(`User ${locals.user.cid} booked ${callsign}`, { start, end });
		return { form };
	},

	update: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(bookingUpdateSchema));
		if (!locals.user) return fail(401, { form });
		if (!form.valid) return fail(400, { form });

		const { id, start, end } = form.data;
		const bookings = await fetchBookings();
		const booking = bookings.find((candidate) => candidate.id === id);

		if (!booking || !canManageBooking(booking, locals.user.cid, locals.roles)) {
			return setError(form, '', "You can't edit this booking", { status: 403 });
		}

		const conflict = findBookingConflict(bookings, booking.callsign, start, end, id);
		if (conflict) {
			return setError(form, '', `This position is already booked ${formatZuluRange(conflict)}`);
		}

		const result = await updateBooking(id, {
			start: formatBookingTime(start),
			end: formatBookingTime(end)
		});

		if (!result.ok) return setError(form, '', result.message, { status: result.status });

		logger.info(`User ${locals.user.cid} updated booking ${id} (${booking.callsign})`, {
			start,
			end
		});
		return { form };
	},

	delete: async ({ request, locals }) => {
		if (!locals.user) return fail(401);

		const id = Number((await request.formData()).get('id'));
		const booking = await fetchBooking(id);

		if (!booking || !canManageBooking(booking, locals.user.cid, locals.roles)) {
			return fail(403, { message: "You can't delete this booking" });
		}

		const result = await deleteBooking(id);
		if (!result.ok) return fail(result.status, { message: result.message });

		logger.info(`User ${locals.user.cid} deleted booking ${id} (${booking.callsign})`);
		return { success: true };
	}
};

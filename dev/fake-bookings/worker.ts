// A stand-in for the booking system's API, for local development only: run it beside the site (see
// the README's "Bookings from a fake booking system") and point VATSIM_BOOKING_API_URL at it.
// It answers only what the site calls, in the booking system's own shapes and envelope, and checks
// that a key is sent. Bookings live in memory, so they reset when it restarts. Every CID is made up;
// the repository is public.

type Booking = {
	id: number;
	externalId: string;
	cid: string;
	callsign: string;
	type: string;
	start: string;
	end: string;
};

let nextId = 100;
const bookings: Booking[] = [];

const ok = (data: unknown, status = 200) => Response.json({ success: true, data }, { status });
const refuse = (status: number, message: string) =>
	Response.json({ success: false, message }, { status });

// Back-to-back bookings (one ends as the next starts) don't overlap
const clash = (b: Pick<Booking, 'callsign' | 'start' | 'end' | 'externalId'>) =>
	bookings.find(
		(other) =>
			other.externalId !== b.externalId &&
			other.callsign === b.callsign &&
			other.start < b.end &&
			other.end > b.start
	);

export default {
	async fetch(request: Request) {
		const url = new URL(request.url);
		const path = url.pathname.replace(/^\/api/, '');
		if (!request.headers.get('Authorization')?.startsWith('Bearer ')) {
			return refuse(401, 'Missing API key');
		}

		if (request.method === 'GET' && path === '/org/bookings') return ok(bookings);

		if (request.method === 'POST' && path === '/bookings/external') {
			const body = (await request.json()) as Omit<Booking, 'id'>;
			if (bookings.some((b) => b.externalId === body.externalId)) {
				return refuse(409, 'A booking with this externalId already exists');
			}
			if (clash(body)) return refuse(409, 'This position is already booked at that time');
			const booking = { id: nextId++, ...body, type: body.type ?? 'booking' };
			bookings.push(booking);
			return ok(booking, 201);
		}

		const match = /^\/bookings\/external\/(.+)$/.exec(path);
		const index = match
			? bookings.findIndex((b) => b.externalId === decodeURIComponent(match[1]))
			: -1;
		if (match && index === -1) return refuse(404, 'Booking not found');

		if (match && request.method === 'PUT') {
			const change = (await request.json()) as Partial<Booking>;
			const updated = { ...bookings[index], ...change };
			if (clash(updated)) return refuse(409, 'This position is already booked at that time');
			bookings[index] = updated;
			return ok(updated);
		}

		if (match && request.method === 'DELETE') {
			bookings.splice(index, 1);
			return new Response(null, { status: 204 });
		}

		return refuse(404, 'Not found');
	}
};

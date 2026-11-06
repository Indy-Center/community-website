export type BookingType = 'booking' | 'event' | 'exam' | 'training';

// Times are UTC, formatted as "YYYY-MM-DD HH:mm:ss"
export type AtcBooking = {
	// The booking system's own number
	id: number;
	// Our ID for it, set when this site made the booking. Updating and cancelling go by this, so a
	// booking made elsewhere (null) can't be changed from here.
	externalId: string | null;
	callsign: string;
	cid: number;
	type: BookingType;
	start: string;
	end: string;
	// Sent to the bookings Worker but not in its list yet; the position is held meanwhile
	pending?: boolean;
};

// What the bookings Worker (Indy-Center/bookings-worker) says to us over the BOOKINGS service
// binding. Typed here, only for the calls we make, until its npm package
// (@indy-center/bookings-worker) is published.
export type WorkerBooking = {
	id: number;
	externalId: string | null;
	cid: number;
	callsign: string;
	type: BookingType;
	start: Date;
	end: Date;
};

// A bookable position from the CMS feed; retired ones are left out. Credentials: every entry must
// be met, and an entry is met by holding any one of its `anyOf` credentials or a higher one.
export type WorkerPosition = {
	callsign: string;
	name: string;
	radioName: string;
	frequency: number;
	facility: { id: string; name: string; parent: { id: string; name: string } | null };
	requiredCredentials: { anyOf: string[] }[];
};

export type BookingsWorker = {
	listOrgBookings(): Promise<WorkerBooking[]>;
	getPositions(): Promise<WorkerPosition[]>;
	// Writes return once queued; the Worker retries, and drops what the booking system refuses
	createBooking(booking: {
		externalId: string;
		cid: number;
		callsign: string;
		start: Date;
		end: Date;
	}): Promise<void>;
	updateBooking(change: { externalId: string; start?: Date; end?: Date }): Promise<void>;
	cancelBooking(ref: { externalId: string }): Promise<void>;
};

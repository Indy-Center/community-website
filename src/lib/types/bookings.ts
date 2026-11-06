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

export type BookingsWorker = {
	listOrgBookings(): Promise<WorkerBooking[]>;
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

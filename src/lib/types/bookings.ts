export type BookingType = 'booking' | 'event' | 'exam' | 'training';

// Times are UTC, formatted as "YYYY-MM-DD HH:mm:ss"
export type AtcBooking = {
	id: number;
	callsign: string;
	cid: number;
	type: BookingType;
	start: string;
	end: string;
	division: string | null;
	subdivision: string | null;
};

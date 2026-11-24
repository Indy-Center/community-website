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
	// Stands in for an event's many bookings: the calendar shows this one block, and opening it
	// lists them (see groupEventBookings)
	group?: { eventId: string; name: string; members: AtcBooking[] };
};

// A position from the CMS catalogue, with every field Centerline's PositionInfo reads (so the
// catalogue goes to setPositions as it is) plus what bookings use. Credentials: every entry must
// be met, and an entry is met by holding any one of its `anyOf` credentials or a higher one.
export type CmsPosition = {
	// The vNAS id
	id: string;
	callsign: string;
	// The sector or position name: "Falmouth 83"
	name: string;
	// As controllers say it: "FLM 83"; null where the CMS has none
	shortName: string | null;
	// What pilots call it: "Indy Center"
	radioName: string;
	// In hertz
	frequency: number;
	// vNAS no longer lists it
	retired: boolean;
	// The CMS stars each facility's primary position
	starred?: boolean;
	facility: { id: string; name: string; parent: { id: string; name: string } | null };
	requiredCredentials: { anyOf: string[] }[];
};

export type NewBooking = {
	externalId: string;
	cid: number;
	callsign: string;
	type?: BookingType;
	start: Date;
	end: Date;
};

// A member of our organization's roster in the booking system. Every field is always sent: what is
// left out takes the booking system's default (member, home, not a mentor).
export type BookingMember = {
	cid: number;
	rating: number;
	role: 'member' | 'manager';
	isHome: boolean;
	isMentor: boolean;
};

// One controller's endorsement on a position restriction, such as Indy Center's T2
export type RestrictionEndorsement = { id: string; cid: number };

// The booking system as the site sees it (see $lib/server/bookingsApi). Writes return once the
// booking system has accepted them, and throw BookingRefusedError with its reason when it won't.
export type BookingsClient = {
	listOrgBookings(): Promise<AtcBooking[]>;
	createBooking(booking: NewBooking): Promise<void>;
	updateBooking(change: { externalId: string; start?: Date; end?: Date }): Promise<void>;
	cancelBooking(ref: { externalId: string }): Promise<void>;
	listMembers(): Promise<BookingMember[]>;
	// The whole roster: anyone left out is removed
	replaceMembers(members: BookingMember[]): Promise<void>;
	listEndorsements(restrictionId: string): Promise<RestrictionEndorsement[]>;
	grantEndorsement(restrictionId: string, cid: number): Promise<void>;
	revokeEndorsement(restrictionId: string, endorsementId: string): Promise<void>;
};

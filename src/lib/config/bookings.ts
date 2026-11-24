// The CMS stars the primary position of each facility. Positions listed here count as primary too,
// for any the CMS hasn't starred (Falmouth 83 for the center); they head their list and the
// center's gets a Primary badge.
export const EXTRA_PRIMARY_POSITIONS: string[] = ['IND_83_CTR'];

// Emergency (guard) positions are in the CMS feed but are never bookable
export const UNBOOKABLE_POSITIONS = /_EM_/;

// Controllers get a Discord DM from Indy Larry this long before a booking starts, the same
// lead time Larry uses to show a facility as planned
export const BOOKING_REMINDER_HOURS = 3;

export const BOOKINGS_URL = 'https://flyindycenter.com/bookings';

// The booking system refuses longer bookings, and ones starting further ahead
export const MAX_BOOKING_HOURS = 13;
export const MAX_BOOKING_ADVANCE_DAYS = 180;

// The roster endorsement that earns the booking system's Indy Center (T2) restriction
// endorsement. The restriction's own ID is the VATSIM_BOOKING_T2_RESTRICTION_ID setting.
export const T2_ENDORSEMENT = 'T2-CTR';

// VATUSA facility roles that make someone a mentor: they may book training for students here, and
// are flagged as mentors in the booking system's roster
export const MENTOR_ROLES = ['ATM', 'DATM', 'TA', 'INS', 'MTR'];

// While bookings are tried out, /bookings, its nav link and the home page's bookings panel are for
// admins and beta testers only. Set to false to open them to every member.
export const BOOKINGS_BETA_ONLY = true;

// "Simple" ATCTs, by callsign prefix (SOP 3.20, Simple ATCT Definitions): S-GC may work ground and
// S-LC tower here. Every other ATCT is advanced, needing A-GC and A-LC.
//
// TODO: these rules live here only because the CMS positions feed doesn't follow SOP 3.20 yet: it
// asks A-GC/A-LC at every simple field. Once the CMS's requiredCredentials match the SOP, drop this
// list and getSopRequirements (src/lib/utils/bookings.ts) and read the feed's requirements again.
export const SIMPLE_ATCT_FACILITIES = [
	'AID',
	'BAK',
	'BMG',
	'CRW',
	'DAY',
	'EVV',
	'FFO',
	'FTK',
	'HBE',
	'HTS',
	'HUF',
	'ILN',
	'LCK',
	'LEX',
	'LOU',
	'LUK',
	'MIE',
	'OSU',
	'OWB',
	'PKB',
	'TZR'
];

// Credentials a position can require, from the lowest up. Holding one covers every credential
// below it. Others, such as T2-CTR, only match themselves.
export const CREDENTIAL_LADDER = ['S-GC', 'A-GC', 'S-LC', 'A-LC', 'T-RC', 'E-RC'];

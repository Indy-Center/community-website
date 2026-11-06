// The CMS stars the primary position of each facility (Falmouth 83 for the center), but the
// bookings Worker doesn't pass that on yet. List the positions to treat as primary here until it
// does; they head their list and the center's gets a Primary badge.
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

// Credentials a position can require, from the lowest up. Holding one covers every credential
// below it. Others, such as T2-CTR, only match themselves.
export const CREDENTIAL_LADDER = ['S-GC', 'A-GC', 'S-LC', 'A-LC', 'T-RC', 'E-RC'];

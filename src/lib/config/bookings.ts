// Fields that need advanced (A-) certifications for ground and tower
export const ADVANCED_FIELDS = ['IND', 'CVG', 'SDF', 'CMH'];

// vNAS stars the primary position for each facility; list any other positions the SOPs
// treat as primary here. TRACON and ATCT bookings are limited to primary positions, while
// every center sector is bookable with the primary ones listed first.
export const EXTRA_PRIMARY_POSITIONS: string[] = [];

// Emergency/guard positions are never bookable
export const UNBOOKABLE_POSITIONS = /_EM_/;

// Controllers get a Discord DM from Indy Larry this long before a booking starts, the same
// lead time Larry uses to show a facility as planned
export const BOOKING_REMINDER_HOURS = 3;

export const BOOKINGS_URL = 'https://flyindycenter.com/bookings';

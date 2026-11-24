import { vi } from 'vitest';
import type {
	AtcBooking,
	BookingMember,
	CmsPosition,
	RestrictionEndorsement
} from '$lib/types/bookings';

/**
 * A stand-in for the booking system's client: every call is a mock that answers empty, so a test
 * sets only what it reads (`listed` bookings, roster `members`, T2 `endorsements`).
 */
export function stubBookingsClient(
	opts: {
		listed?: AtcBooking[];
		members?: BookingMember[];
		endorsements?: RestrictionEndorsement[];
	} = {}
) {
	return {
		listOrgBookings: vi.fn(async () => opts.listed ?? []),
		createBooking: vi.fn(async () => {}),
		updateBooking: vi.fn(async () => {}),
		cancelBooking: vi.fn(async () => {}),
		listMembers: vi.fn(async () => opts.members ?? []),
		replaceMembers: vi.fn(async (_members: BookingMember[]) => {}),
		listEndorsements: vi.fn(async (_restrictionId: string) => opts.endorsements ?? []),
		grantEndorsement: vi.fn(async (_restrictionId: string, _cid: number) => {}),
		revokeEndorsement: vi.fn(async (_restrictionId: string, _endorsementId: string) => {})
	};
}

/** A position as the CMS catalogue serves it; made up, like every position in tests. */
export function cmsPosition(callsign: string, overrides: Partial<CmsPosition> = {}): CmsPosition {
	return {
		id: `vnas-${callsign}`,
		callsign,
		name: callsign,
		shortName: null,
		radioName: `${callsign} radio`,
		frequency: 121600000,
		retired: false,
		facility: { id: 'IND', name: 'Indianapolis', parent: null },
		requiredCredentials: [],
		...overrides
	};
}

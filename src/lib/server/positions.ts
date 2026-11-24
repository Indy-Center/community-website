import { logger } from '$lib/server/logger';
import { readKept, type ReadStore } from '$lib/server/keptReads';
import type { CmsPosition } from '$lib/types/bookings';

/**
 * The CMS catalogue's positions, the one place the site reads them. The root layout hands them to
 * Centerline (`setPositions`), so every `<Position callsign>` can name itself, and /bookings takes
 * the bookable ones from here. The CMS copies vNAS once a day, so a copy is kept for minutes and
 * served for days while the CMS is failing. With no copy at all, there are no positions: components
 * then show the callsign alone.
 */

/** Where the CMS serves its public positions feed (no token needed). */
export const POSITIONS_PATH = '/api/public/v1/positions';
/** How long a copy is used without asking the CMS. */
export const POSITIONS_FRESH_MS = 5 * 60_000;
/** How long the last good copy is served while the CMS is failing. */
export const POSITIONS_KEEP_MS = 7 * 24 * 60 * 60_000;
const TIMEOUT_MS = 5_000;

type Wire = Record<string, unknown>;

/** The feed (a bare array) as positions, retired ones included: Centerline skips those itself. */
export function fromCmsPositions(feed: unknown): CmsPosition[] {
	if (!Array.isArray(feed)) throw new Error('The CMS positions feed was not a list');
	return (feed as Wire[]).map((p) => {
		const facility = (p.facility ?? {}) as Wire;
		const parent = facility.parent as Wire | null | undefined;
		return {
			id: String(p.id),
			callsign: String(p.callsign),
			name: String(p.name),
			shortName: typeof p.shortName === 'string' && p.shortName ? p.shortName : null,
			radioName: String(p.radioName),
			frequency: Number(p.frequency),
			retired: p.retired === true,
			starred: p.starred === true,
			facility: {
				id: String(facility.id),
				name: String(facility.name),
				parent: parent ? { id: String(parent.id), name: String(parent.name) } : null
			},
			requiredCredentials: (Array.isArray(p.requiredCredentials)
				? (p.requiredCredentials as Wire[])
				: []
			).map((c) => ({ anyOf: Array.isArray(c.anyOf) ? c.anyOf.map(String) : [] }))
		};
	});
}

export type PositionsReader = () => Promise<CmsPosition[]>;

/** Reads the catalogue's positions; never throws, giving none when there is no copy at all. */
export function createPositionsReader(opts: {
	cmsUrl: string;
	store: ReadStore;
	fetch?: typeof fetch;
	now?: () => number;
}): PositionsReader {
	const fetchImpl = opts.fetch ?? fetch;

	return async () => {
		try {
			return await readKept({
				store: opts.store,
				key: POSITIONS_PATH,
				now: opts.now ?? Date.now,
				freshMs: POSITIONS_FRESH_MS,
				keepMs: POSITIONS_KEEP_MS,
				load: async () => {
					const response = await fetchImpl(new URL(POSITIONS_PATH, opts.cmsUrl), {
						headers: { Accept: 'application/json' },
						signal: AbortSignal.timeout(TIMEOUT_MS)
					});
					if (!response.ok) throw new Error(`The CMS answered ${response.status}`);
					return response.json();
				},
				parse: fromCmsPositions
			});
		} catch (error) {
			logger.error('The CMS positions could not be read, and no copy is kept', error);
			return [];
		}
	};
}

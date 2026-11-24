import { resolvePosition } from '@indy-center/centerline-svelte';
import type { CmsPosition } from '$lib/types/bookings';
import { formatPosition } from '$lib/utils/bookings';

/**
 * A position in words, for pages: found in the catalogue by Centerline's own lookup (relief logins
 * included), then worded by `formatPosition`. Only for code the SvelteKit build bundles: the cron
 * Worker can't resolve Centerline, so server code that it runs uses `formatPosition` directly.
 */
export const positionText = (callsign: string, positions: readonly CmsPosition[]) =>
	formatPosition(resolvePosition(callsign, positions)?.position, callsign);

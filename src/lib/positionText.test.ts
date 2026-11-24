import { describe, expect, it } from 'vitest';
import { cmsPosition } from '$lib/testing/bookings';
import { positionText } from './positionText';

const falmouth = cmsPosition('IND_83_CTR', {
	name: 'Falmouth 83',
	shortName: 'FLM 83',
	radioName: 'Indy Center'
});

describe('positionText', () => {
	it('reads like Position inline, without the frequency', () => {
		expect(positionText('IND_83_CTR', [falmouth])).toBe('Indy Center · FLM 83 · Falmouth 83');
	});

	it("finds a relief login as the position it covers, by Centerline's lookup", () => {
		expect(positionText('IND_831_CTR', [falmouth])).toBe('Indy Center · FLM 83 · Falmouth 83');
	});

	it('shows an unknown callsign alone', () => {
		expect(positionText('XYZ_GND', [falmouth])).toBe('XYZ_GND');
	});
});

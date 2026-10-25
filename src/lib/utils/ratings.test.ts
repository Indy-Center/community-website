import { describe, expect, it } from 'vitest';
import { byRating } from './ratings';

describe('byRating', () => {
	it('sorts highest rating first, then by name, with missing ratings last', () => {
		const members = [
			{ name: 'Zed', rating: 'S2' },
			{ name: 'Off Roster', rating: null },
			{ name: 'Bea', rating: 'I1' },
			{ name: 'Al', rating: 'S2' },
			{ name: 'Cy', rating: 'C1' },
			{ name: 'Dee', rating: 'OBS' },
			{ name: 'Eve', rating: 'ADM' }
		];

		expect(members.sort(byRating).map((m) => m.name)).toEqual([
			'Eve',
			'Bea',
			'Cy',
			'Al',
			'Zed',
			'Dee',
			'Off Roster'
		]);
	});
});

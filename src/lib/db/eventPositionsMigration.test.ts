import { describe, expect, it } from 'vitest';
import { testDbBefore } from '$lib/testing/db';

describe('0013_event_positions_drop_solo_endorsements', () => {
	it('keeps only the other codes of a position that asked for a solo endorsement', async () => {
		const { client, migrate } = await testDbBefore('0013_event_positions_drop_solo_endorsements');
		await client.execute(
			`INSERT INTO events (id, name, type, roster_type, description, start_time, end_time)
			 VALUES ('event-1', 'Example Fly-In', 'home', 'assigned', 'Made up.', 1793000000, 1793010000)`
		);
		const insert = (position: string, certifications: string[], endorsements: string[]) =>
			client.execute({
				sql: `INSERT INTO event_positions (event_id, position, required_certifications, required_endorsements)
				      VALUES ('event-1', ?, ?, ?)`,
				args: [position, JSON.stringify(certifications), JSON.stringify(endorsements)]
			});
		await insert('P_ONE', ['S-GC'], ['APP-SOLO', 'T2-CTR', 'TWR-SOLO', 'S-LC']);
		await insert('P_TWO', [], ['TWR-SOLO']);
		await insert('P_THREE', ['APP-SOLO'], ['T2-CTR', 'S-LC']);
		await insert('P_FOUR', [], []);

		await migrate();

		const { rows } = await client.execute(
			'SELECT position, required_certifications AS certs, required_endorsements AS ends FROM event_positions ORDER BY position'
		);
		expect(rows.map((row) => [row.position, row.certs, row.ends])).toEqual([
			['P_FOUR', '[]', '[]'],
			['P_ONE', '["S-GC"]', '["T2-CTR","S-LC"]'],
			['P_THREE', '["APP-SOLO"]', '["T2-CTR","S-LC"]'],
			['P_TWO', '[]', '[]']
		]);
	});
});

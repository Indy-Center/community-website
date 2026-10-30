// A stand-in for the training app's `TrainingRpc` entrypoint, for local development only: run it
// beside the site under `wrangler dev` (see the README) and the site's `TRAINING` binding reaches
// it. It answers 150 made-up members, more than D1's 100-parameter limit, so a statement that
// grows with the roster fails here as it would in production. Every name and CID is made up; the
// repository is public.
import { WorkerEntrypoint } from 'cloudflare:workers';
import type { Roster, RosterMember } from '@indy-center/training-tools';

const MEMBER_COUNT = 150;

const CREDENTIALS: Roster['credentials'] = [
	{ code: 'S-GC', kind: 'certification', name: 'Simple Ground Control', order: 1, description: '' },
	{
		code: 'A-GC',
		kind: 'certification',
		name: 'Advanced Ground Control',
		order: 2,
		description: ''
	},
	{
		code: 'A-LC',
		kind: 'certification',
		name: 'Advanced Local Control',
		order: 3,
		description: ''
	},
	{
		code: 'T-RC',
		kind: 'certification',
		name: 'Terminal Radar Control',
		order: 4,
		description: ''
	},
	{ code: 'E-RC', kind: 'certification', name: 'Enroute Radar Control', order: 5, description: '' },
	{ code: 'S-LC', kind: 'endorsement', name: 'Simple Local Control', order: 6, description: '' },
	{ code: 'T2-CTR', kind: 'endorsement', name: 'Tier 2 Center', order: 7, description: '' }
];

const FIRST_NAMES = [
	'Avery',
	'Blake',
	'Casey',
	'Drew',
	'Emery',
	'Finley',
	'Gray',
	'Harper',
	'Indigo',
	'Jules'
];
const LAST_NAMES = [
	'Example',
	'Sample',
	'Placeholder',
	'Testwell',
	'Mockford',
	'Fakeley',
	'Demo',
	'Stubbs',
	'Dummy',
	'Specimen',
	'Trial',
	'Pretend',
	'Madeup',
	'Notreal',
	'Fiction'
];
const RATINGS = ['S1', 'S2', 'S3', 'C1', 'C3'];
const CERTIFICATIONS = [null, 'S-GC', 'A-GC', 'A-LC', 'T-RC', 'E-RC'];
// The first few members hold the staff roles, so the staff page has someone in each
const ROLES = [['ATM'], ['DATM'], ['TA'], ['EC'], ['FE'], ['WM'], ['INS'], ['MTR']];

function member(i: number): RosterMember {
	const certification = CERTIFICATIONS[i % CERTIFICATIONS.length];
	return {
		cid: String(9000001 + i),
		firstName: FIRST_NAMES[i % FIRST_NAMES.length],
		lastName: LAST_NAMES[Math.floor(i / FIRST_NAMES.length) % LAST_NAMES.length],
		// Every seventh member has VATUSA name privacy set: the roster shows their CID instead
		namePrivacy: i % 7 === 3,
		rating: RATINGS[i % RATINGS.length],
		facilityJoinedAt: i % 11 === 5 ? null : new Date(Date.UTC(2020, 0, 1 + i * 9)).toISOString(),
		roles: ROLES[i] ?? [],
		certification,
		endorsements: [
			...(certification && i % 4 === 0 ? ['S-LC'] : []),
			...(certification === 'E-RC' && i % 3 === 0 ? ['T2-CTR'] : [])
		]
	};
}

export class TrainingRpc extends WorkerEntrypoint {
	async getRoster(): Promise<Roster> {
		return {
			credentials: CREDENTIALS,
			members: Array.from({ length: MEMBER_COUNT }, (_, i) => member(i))
		};
	}
}

export default {
	fetch: () => new Response('Fake training-tools Worker: call TrainingRpc over its binding.')
};

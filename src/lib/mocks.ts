import type { VnasController, VatsimEvent } from './types.js';

// Environment-based mock data toggle
export const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';

// Environment-based count limits
const MOCK_EVENTS_COUNT = parseInt(import.meta.env.VITE_MOCK_EVENTS || '2');
const MOCK_CONTROLLERS_COUNT = parseInt(import.meta.env.VITE_MOCK_CONTROLLERS || '12');

const ALL_MOCK_CONTROLLERS: VnasController[] = [
	{
		artccId: 'ZID',
		primaryFacilityId: 'CMH',
		primaryPositionId: '01G90ZME1W692E11A8CWZPK4CO',
		role: 'Controller',
		isActive: true,
		isObserver: false,
		loginTime: '2025-08-30T21:19:01.446Z',
		positions: [
			{
				facilityId: 'CMH',
				facilityName: 'Port Columbus International Airport',
				positionId: '01G90ZME1W692E11A8CWZPK4CO',
				positionName: 'Tower',
				positionType: 'Tower',
				radioName: 'Columbus Tower',
				defaultCallsign: 'CMH_TWR',
				frequency: 132.70,
				isPrimary: true,
				isActive: true
			}
		],
		vatsimData: {
			cid: '1530662',
			realName: 'Controller Name',
			controllerInfo: 'Local Control for KCMH',
			userRating: 'Controller3',
			loginTime: '2025-08-30T22:10:18.2468135Z'
		}
	}
];

const ALL_MOCK_EVENTS: VatsimEvent[] = [
	{
		id: 1,
		type: 'event',
		name: 'Indianapolis Fly-In',
		link: 'https://example.com/event1',
		organisers: [
			{
				region: 'NA',
				division: 'ZID',
				subdivision: null,
				organised_by_vatsim: true
			}
		],
		airports: [{ icao: 'KIND' }, { icao: 'KIND' }],
		routes: ['KIND-KIND'],
		start_time: '2025-09-15T18:00:00Z',
		end_time: '2025-09-15T22:00:00Z',
		short_description: 'Join us for a fun fly-in event at Indianapolis!',
		description:
			'A comprehensive fly-in event featuring various aircraft types and exciting routes around the Indianapolis area.',
		banner: 'https://example.com/banner1.jpg'
	},
	{
		id: 2,
		type: 'event',
		name: 'Cross-Country Challenge',
		link: 'https://example.com/event2',
		organisers: [
			{
				region: 'NA',
				division: 'ZID',
				subdivision: 'IND',
				organised_by_vatsim: false
			}
		],
		airports: [{ icao: 'KORD' }, { icao: 'KIND' }],
		routes: ['KORD-KIND'],
		start_time: '2025-09-20T20:00:00Z',
		end_time: '2025-09-20T23:00:00Z',
		short_description: 'Challenge yourself with a cross-country flight!',
		description:
			'Test your navigation skills with this challenging cross-country flight from Chicago to Indianapolis.',
		banner: 'https://example.com/banner2.jpg'
	},
	{
		id: 3,
		type: 'event',
		name: 'Night Flying Special',
		link: 'https://example.com/event3',
		organisers: [
			{
				region: 'NA',
				division: 'ZID',
				subdivision: 'CMH',
				organised_by_vatsim: true
			}
		],
		airports: [{ icao: 'KCMH' }, { icao: 'KDAY' }],
		routes: ['KCMH-KDAY'],
		start_time: '2025-10-05T01:00:00Z',
		end_time: '2025-10-05T04:00:00Z',
		short_description: 'Experience the beauty of night flying in Ohio!',
		description:
			'Join us for a special night flying event through Ohio airspace with full ATC coverage.',
		banner: 'https://example.com/banner3.jpg'
	},
	{
		id: 4,
		type: 'event',
		name: 'GA Appreciation Day',
		link: 'https://example.com/event4',
		organisers: [
			{
				region: 'NA',
				division: 'ZID',
				subdivision: null,
				organised_by_vatsim: true
			}
		],
		airports: [{ icao: 'KLUK' }, { icao: 'KFWA' }],
		routes: ['KLUK-KFWA'],
		start_time: '2025-10-12T16:00:00Z',
		end_time: '2025-10-12T20:00:00Z',
		short_description: 'Celebrating general aviation in the ZID region!',
		description:
			'A special event dedicated to general aviation pilots with multiple GA-friendly airports staffed.',
		banner: 'https://example.com/banner4.jpg'
	}
];

// Export filtered arrays based on environment variables
export const MOCK_CONTROLLERS: VnasController[] = ALL_MOCK_CONTROLLERS.slice(0, MOCK_CONTROLLERS_COUNT);
export const MOCK_EVENTS: VatsimEvent[] = ALL_MOCK_EVENTS.slice(0, MOCK_EVENTS_COUNT);
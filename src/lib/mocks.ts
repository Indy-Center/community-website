import type { VnasController, VatsimEvent } from './types.js';

// Environment-based mock data toggle
export const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';

// Environment-based count limits
const MOCK_EVENTS_COUNT = parseInt(import.meta.env.VITE_MOCK_EVENTS || '2');
const MOCK_CONTROLLERS_COUNT = parseInt(import.meta.env.VITE_MOCK_CONTROLLERS || '12');

const ALL_MOCK_CONTROLLERS: VnasController[] = [
	{
		artccId: 'ZID',
		primaryFacilityId: 'IND',
		primaryPositionId: '01G90ZME1W692E11A8CWZPK1DM',
		role: 'Controller',
		isActive: true,
		isObserver: false,
		loginTime: '2025-08-30T21:19:01.446Z',
		positions: [
			{
				facilityId: 'IND',
				facilityName: 'Indianapolis TRACON',
				positionId: '01G90ZME1W692E11A8CWZPK1DM',
				positionName: 'Final',
				positionType: 'Tracon',
				radioName: 'Indianapolis Approach',
				defaultCallsign: 'IND_F_APP',
				frequency: 125500000,
				isPrimary: true,
				isActive: true
			}
		],
		vatsimData: {
			cid: '1045722',
			realName: 'Andrew H',
			controllerInfo: 'Top-Down Service for IND',
			userRating: 'Controller1',
			loginTime: '2025-08-30T21:19:01.4461285Z'
		}
	},
	{
		artccId: 'ZID',
		primaryFacilityId: 'IND',
		primaryPositionId: '01G90ZME1W692E11A8CWZPK1DM',
		role: 'Controller',
		isActive: true,
		isObserver: false,
		loginTime: '2025-08-30T21:19:01.446Z',
		positions: [
			{
				facilityId: 'IND',
				facilityName: 'Indianapolis TRACON',
				positionId: '01G90ZME1W692E11A8CWZPK1DM',
				positionName: 'Ground',
				positionType: 'Tracon',
				radioName: 'Indianapolis Ground',
				defaultCallsign: 'IND_GND',
				frequency: 121900000,
				isPrimary: true,
				isActive: true
			}
		],
		vatsimData: {
			cid: '1045723',
			realName: 'Sarah M',
			controllerInfo: 'Ground Control for IND',
			userRating: 'Controller2',
			loginTime: '2025-08-30T21:15:30.1234567Z'
		}
	},
	{
		artccId: 'ZID',
		primaryFacilityId: 'KIND',
		primaryPositionId: '01G90ZME1W692E11A8CWZPK2AM',
		role: 'Controller',
		isActive: true,
		isObserver: false,
		loginTime: '2025-08-30T21:19:01.446Z',
		positions: [
			{
				facilityId: 'KIND',
				facilityName: 'Indianapolis International Airport',
				positionId: '01G90ZME1W692E11A8CWZPK2AM',
				positionName: 'Tower',
				positionType: 'Tower',
				radioName: 'Indianapolis Tower',
				defaultCallsign: 'IND_TWR',
				frequency: 120900000,
				isPrimary: true,
				isActive: true
			}
		],
		vatsimData: {
			cid: '1123456',
			realName: 'Michael J',
			controllerInfo: 'Local Control for KIND',
			userRating: 'Controller3',
			loginTime: '2025-08-30T20:45:15.7890123Z'
		}
	},
	{
		artccId: 'ZID',
		primaryFacilityId: 'CVG',
		primaryPositionId: '01G90ZME1W692E11A8CWZPK3BN',
		role: 'Controller',
		isActive: true,
		isObserver: false,
		loginTime: '2025-08-30T21:19:01.446Z',
		positions: [
			{
				facilityId: 'CVG',
				facilityName: 'Cincinnati TRACON',
				positionId: '01G90ZME1W692E11A8CWZPK3BN',
				positionName: 'Approach',
				positionType: 'Tracon',
				radioName: 'Cincinnati Approach',
				defaultCallsign: 'CVG_APP',
				frequency: 124000000,
				isPrimary: true,
				isActive: true
			}
		],
		vatsimData: {
			cid: '1234567',
			realName: 'Jennifer L',
			controllerInfo: 'Approach Control for CVG',
			userRating: 'Controller2',
			loginTime: '2025-08-30T19:30:42.1357924Z'
		}
	},
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
				facilityName: 'Columbus TRACON',
				positionId: '01G90ZME1W692E11A8CWZPK4CO',
				positionName: 'Departure',
				positionType: 'Tracon',
				radioName: 'Columbus Departure',
				defaultCallsign: 'CMH_DEP',
				frequency: 118750000,
				isPrimary: true,
				isActive: true
			}
		],
		vatsimData: {
			cid: '1345678',
			realName: 'Robert K',
			controllerInfo: 'Departure Control for CMH',
			userRating: 'Controller3',
			loginTime: '2025-08-30T22:10:18.2468135Z'
		}
	},
	{
		artccId: 'ZID',
		primaryFacilityId: 'DAY',
		primaryPositionId: '01G90ZME1W692E11A8CWZPK5DP',
		role: 'Controller',
		isActive: true,
		isObserver: false,
		loginTime: '2025-08-30T21:19:01.446Z',
		positions: [
			{
				facilityId: 'DAY',
				facilityName: 'Dayton TRACON',
				positionId: '01G90ZME1W692E11A8CWZPK5DP',
				positionName: 'Final',
				positionType: 'Tracon',
				radioName: 'Dayton Approach',
				defaultCallsign: 'DAY_APP',
				frequency: 125350000,
				isPrimary: true,
				isActive: true
			}
		],
		vatsimData: {
			cid: '1456789',
			realName: 'Lisa R',
			controllerInfo: 'Final Approach for DAY',
			userRating: 'Controller1',
			loginTime: '2025-08-30T18:55:33.3579246Z'
		}
	},
	{
		artccId: 'ZID',
		primaryFacilityId: 'LEX',
		primaryPositionId: '01G90ZME1W692E11A8CWZPK6EQ',
		role: 'Controller',
		isActive: true,
		isObserver: false,
		loginTime: '2025-08-30T21:19:01.446Z',
		positions: [
			{
				facilityId: 'LEX',
				facilityName: 'Lexington Tower',
				positionId: '01G90ZME1W692E11A8CWZPK6EQ',
				positionName: 'Tower',
				positionType: 'Tower',
				radioName: 'Lexington Tower',
				defaultCallsign: 'LEX_TWR',
				frequency: 118700000,
				isPrimary: true,
				isActive: true
			}
		],
		vatsimData: {
			cid: '1567890',
			realName: 'David W',
			controllerInfo: 'Local Control for KLEX',
			userRating: 'Controller2',
			loginTime: '2025-08-30T17:25:07.4680357Z'
		}
	},
	{
		artccId: 'ZID',
		primaryFacilityId: 'LOU',
		primaryPositionId: '01G90ZME1W692E11A8CWZPK7FR',
		role: 'Controller',
		isActive: true,
		isObserver: false,
		loginTime: '2025-08-30T21:19:01.446Z',
		positions: [
			{
				facilityId: 'LOU',
				facilityName: 'Louisville TRACON',
				positionId: '01G90ZME1W692E11A8CWZPK7FR',
				positionName: 'Approach',
				positionType: 'Tracon',
				radioName: 'Louisville Approach',
				defaultCallsign: 'LOU_APP',
				frequency: 119650000,
				isPrimary: true,
				isActive: true
			}
		],
		vatsimData: {
			cid: '1678901',
			realName: 'Amanda C',
			controllerInfo: 'Approach Control for SDF',
			userRating: 'Controller3',
			loginTime: '2025-08-30T16:40:52.5791468Z'
		}
	},
	{
		artccId: 'ZID',
		primaryFacilityId: 'ZID',
		primaryPositionId: '01G90ZME1W692E11A8CWZPK8GS',
		role: 'Controller',
		isActive: true,
		isObserver: false,
		loginTime: '2025-08-30T21:19:01.446Z',
		positions: [
			{
				facilityId: 'ZID',
				facilityName: 'Indianapolis Center',
				positionId: '01G90ZME1W692E11A8CWZPK8GS',
				positionName: 'High',
				positionType: 'Center',
				radioName: 'Indianapolis Center',
				defaultCallsign: 'ZID_CTR',
				frequency: 134200000,
				isPrimary: true,
				isActive: true
			}
		],
		vatsimData: {
			cid: '1789012',
			realName: 'Christopher T',
			controllerInfo: 'En Route Control - High Sector',
			userRating: 'Controller4',
			loginTime: '2025-08-30T15:12:28.6802579Z'
		}
	},
	{
		artccId: 'ZID',
		primaryFacilityId: 'ZID',
		primaryPositionId: '01G90ZME1W692E11A8CWZPK9HT',
		role: 'Controller',
		isActive: true,
		isObserver: false,
		loginTime: '2025-08-30T21:19:01.446Z',
		positions: [
			{
				facilityId: 'ZID',
				facilityName: 'Indianapolis Center',
				positionId: '01G90ZME1W692E11A8CWZPK9HT',
				positionName: 'Low',
				positionType: 'Center',
				radioName: 'Indianapolis Center',
				defaultCallsign: 'ZID_LOW_CTR',
				frequency: 127800000,
				isPrimary: true,
				isActive: true
			}
		],
		vatsimData: {
			cid: '1890123',
			realName: 'Nicole P',
			controllerInfo: 'En Route Control - Low Sector',
			userRating: 'Controller4',
			loginTime: '2025-08-30T14:37:14.7913680Z'
		}
	},
	{
		artccId: 'ZID',
		primaryFacilityId: 'FWA',
		primaryPositionId: '01G90ZME1W692E11A8CWZPK0IU',
		role: 'Controller',
		isActive: true,
		isObserver: false,
		loginTime: '2025-08-30T21:19:01.446Z',
		positions: [
			{
				facilityId: 'FWA',
				facilityName: 'Fort Wayne Tower',
				positionId: '01G90ZME1W692E11A8CWZPK0IU',
				positionName: 'Tower',
				positionType: 'Tower',
				radioName: 'Fort Wayne Tower',
				defaultCallsign: 'FWA_TWR',
				frequency: 124000000,
				isPrimary: true,
				isActive: true
			}
		],
		vatsimData: {
			cid: '1901234',
			realName: 'Mark S',
			controllerInfo: 'Local Control for KFWA',
			userRating: 'Controller1',
			loginTime: '2025-08-30T13:22:39.8024791Z'
		}
	},
	{
		artccId: 'ZID',
		primaryFacilityId: 'EVV',
		primaryPositionId: '01G90ZME1W692E11A8CWZPK1JV',
		role: 'Controller',
		isActive: true,
		isObserver: false,
		loginTime: '2025-08-30T21:19:01.446Z',
		positions: [
			{
				facilityId: 'EVV',
				facilityName: 'Evansville Tower',
				positionId: '01G90ZME1W692E11A8CWZPK1JV',
				positionName: 'Tower',
				positionType: 'Tower',
				radioName: 'Evansville Tower',
				defaultCallsign: 'EVV_TWR',
				frequency: 119300000,
				isPrimary: true,
				isActive: true
			}
		],
		vatsimData: {
			cid: '2012345',
			realName: 'Kelly B',
			controllerInfo: 'Local Control for KEVV',
			userRating: 'Controller2',
			loginTime: '2025-08-30T12:08:25.9135802Z'
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
export type VatsimMetarResponse = {
	id: string;
	metar: string;
}[];

export type VatsimEvent = {
	id: number;
	type: string;
	name: string;
	link: string;
	organisers: {
		region: string;
		division: string;
		subdivision: string | null;
		organised_by_vatsim: boolean;
	}[];
	airports: {
		icao: string;
	}[];
	routes: string[];
	start_time: string;
	end_time: string;
	short_description: string;
	description: string;
	banner: string;
};

export type VatsimEventResponse = {
	data: VatsimEvent[];
};

export type VatsimUserDataResponse = {
	data: VatsimUserData;
};

export type VatsimUserData = {
	cid: string;
	personal: {
		name_first: string;
		name_last: string;
		name_full: string;
		email: string;
		country: {
			id: string;
			name: string;
		};
	};
	vatsim: {
		rating: {
			id: number;
			long: string;
			short: string;
		};
		pilotrating: {
			id: number;
			long: string;
			short: string;
		};
		division: {
			id: string;
			name: string;
		};
		region: {
			id: string;
			name: string;
		};
		subdivision: {
			id: string;
			name: string;
		};
	};
};
export type VnasController = {
	artccId: string;
	primaryFacilityId: string;
	primaryPositionId: string;
	role: string;
	positions: VnasPosition[];
	isActive: boolean;
	isObserver: boolean;
	loginTime: string;
	vatsimData: VnasVatsimData;
};

export type VnasVatsimData = {
	cid: string;
	realName: string;
	controllerInfo: string;
	userRating: string;
	callsign: string;
	loginTime: string;
};

export type VnasPosition = {
	facilityId: string;
	facilityName: string;
	positionId: string;
	positionName: string;
	positionType: string;
	radioName: string;
	defaultCallsign: string;
	frequency: number;
	isPrimary: boolean;
	isActive: boolean;
	callsign: string;
};

export type VnasControllerResponse = {
	controllers: VnasController[];
};

export type VnasArtccResponse = {
	id: string;
	facility: VnasFacility;
};

export type VnasFacility = {
	id: string;
	type: string;
	name: string;
	childFacilities: VnasChildFacility[];
	positions: VnasFacilityPosition[];
};

type VnasChildFacility = {
	id: string;
	type: string;
	name: string;
	childFacilities: VnasChildFacility[];
	positions: VnasFacilityPosition[];
};

/** A position as the ARTCC data lists it, unlike a controller's position in the data feed. */
export type VnasFacilityPosition = {
	id: string;
	name: string;
	starred: boolean;
	radioName: string;
	callsign: string;
	/** Not in the ARTCC data; the event pages try it before `id` and `callsign`. */
	defaultCallsign?: string;
};

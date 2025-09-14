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
};

export type VnasControllerResponse = {
	controllers: VnasController[];
};

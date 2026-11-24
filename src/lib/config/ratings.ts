// VATSIM's ATC ratings by short code, with the number and long name VATSIM uses. Identity and the
// training app send only the short code; this restores the rest.
export const ATC_RATINGS: Record<string, { id: number; long: string }> = {
	INAC: { id: -1, long: 'Inactive' },
	SUS: { id: 0, long: 'Suspended' },
	OBS: { id: 1, long: 'Observer' },
	S1: { id: 2, long: 'Tower Trainee' },
	S2: { id: 3, long: 'Tower Controller' },
	S3: { id: 4, long: 'Senior Student' },
	C1: { id: 5, long: 'Enroute Controller' },
	C2: { id: 6, long: 'Controller 2' },
	C3: { id: 7, long: 'Senior Controller' },
	I1: { id: 8, long: 'Instructor' },
	I2: { id: 9, long: 'Instructor 2' },
	I3: { id: 10, long: 'Senior Instructor' },
	SUP: { id: 11, long: 'Supervisor' },
	ADM: { id: 12, long: 'Administrator' }
};

import { OAuth2Client } from 'arctic';
import { z } from 'zod';
import { env } from '$env/dynamic/private';
import type { VatsimUserData } from '$lib/types/vatsim';

export const IDENTITY_CALLBACK_PATH = '/login/identity/callback';

const baseUrl = () => env.IDENTITY_URL ?? 'https://id.flyindycenter.com';

export const identityEnabled = () => env.AUTH_PROVIDER === 'identity';

export const identityUrl = (path: string) => `${baseUrl()}${path}`;

// An unregistered client id is just a label with no secret, which identity
// accepts for loopback and flyindycenter.com redirect URIs.
export function identityClient(origin: string) {
	return new OAuth2Client(
		env.IDENTITY_CLIENT_ID ?? 'community-local',
		env.IDENTITY_CLIENT_SECRET ?? null,
		`${origin}${IDENTITY_CALLBACK_PATH}`
	);
}

const UserinfoSchema = z.object({
	sub: z.string().regex(/^\d+$/),
	name: z.string(),
	given_name: z.string().nullable(),
	family_name: z.string().nullable(),
	preferred_name: z.string().nullable(),
	pronouns: z.string().nullable(),
	email: z.string(),
	rating: z.string().nullable(),
	pilot_rating: z.string().nullable(),
	division: z.string().nullable(),
	region: z.string().nullable(),
	subdivision: z.string().nullable(),
	roles: z.array(z.string()),
	operating_initials: z.string().nullable(),
	active: z.boolean()
});

export type Userinfo = z.infer<typeof UserinfoSchema>;

/** Returns null when identity rejects the token: the user logged out or was disabled. */
export async function fetchUserinfo(accessToken: string): Promise<Userinfo | null> {
	const response = await fetch(identityUrl('/oauth/userinfo'), {
		headers: { Authorization: `Bearer ${accessToken}` },
		signal: AbortSignal.timeout(5000)
	});

	if (response.status === 401) {
		return null;
	}
	if (!response.ok) {
		throw new Error(`Identity userinfo failed with status ${response.status}`);
	}

	return UserinfoSchema.parse(await response.json());
}

export async function revokeToken(accessToken: string): Promise<void> {
	await fetch(identityUrl('/oauth/revoke'), {
		method: 'POST',
		body: new URLSearchParams({ token: accessToken })
	});
}

// Identity roles are `app:permission`. This site's own roles drop the
// `community:` prefix (community:admin -> admin); the rest pass through.
export function toSiteRoles(roles: string[]): string[] {
	return roles.map((role) => role.replace(/^community:/, ''));
}

// Identity serves only the short rating codes; these restore the id and long
// name that VATSIM Connect sends alongside them.
const ATC_RATINGS: Record<string, { id: number; long: string }> = {
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

const PILOT_RATINGS: Record<string, { id: number; long: string }> = {
	NEW: { id: 0, long: 'Basic Member' },
	PPL: { id: 1, long: 'Private Pilot License' },
	IR: { id: 3, long: 'Instrument Rating' },
	CMEL: { id: 7, long: 'Commercial Multi-Engine License' },
	ATPL: { id: 15, long: 'Airline Transport Pilot License' },
	FI: { id: 31, long: 'Flight Instructor' },
	FE: { id: 63, long: 'Flight Examiner' }
};

// The rest of the site reads the VATSIM Connect profile shape from users.data.
// Identity serves ids only for division, region and subdivision, so their
// names fall back to the id.
export function toVatsimUserData(claims: Userinfo): VatsimUserData {
	const named = (id: string | null) => ({ id: id ?? '', name: id ?? '' });
	const rated = (short: string | null, known: Record<string, { id: number; long: string }>) => ({
		...(known[short ?? ''] ?? { id: 0, long: short ?? '' }),
		short: short ?? ''
	});

	return {
		cid: claims.sub,
		personal: {
			name_first: claims.given_name ?? '',
			name_last: claims.family_name ?? '',
			name_full: [claims.given_name, claims.family_name].filter(Boolean).join(' '),
			email: claims.email,
			country: { id: '', name: '' }
		},
		vatsim: {
			rating: rated(claims.rating, ATC_RATINGS),
			pilotrating: rated(claims.pilot_rating, PILOT_RATINGS),
			division: named(claims.division),
			region: named(claims.region),
			subdivision: named(claims.subdivision)
		}
	};
}

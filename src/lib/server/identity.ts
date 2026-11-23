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

/** The settings it reads: IDENTITY_URL, IDENTITY_API_CLIENT_ID, IDENTITY_API_CLIENT_SECRET. */
export type IdentityApiEnv = Record<string, string | undefined>;

/** A refused call to identity's API, carrying identity's status and `error` code. */
export class IdentityApiError extends Error {
	constructor(
		message: string,
		readonly status: number,
		readonly code: string | null
	) {
		super(message);
		this.name = 'IdentityApiError';
	}
}

async function errorCode(response: Response): Promise<string | null> {
	try {
		const body = (await response.json()) as { error?: unknown };
		return typeof body.error === 'string' ? body.error : null;
	} catch {
		return null;
	}
}

async function refused(what: string, response: Response) {
	const code = await errorCode(response);
	return new IdentityApiError(
		`Identity ${what} failed with status ${response.status}${code ? ` (${code})` : ''}`,
		response.status,
		code
	);
}

// The API client's token, kept in memory until a minute before it expires.
let cachedToken: { value: string; expiresAt: number } | null = null;

export const clearClientTokenCache = () => {
	cachedToken = null;
};

/**
 * A client-credentials token for community's API client (`community-api`),
 * separate from the sign-in client. Cached; `refresh` skips the cache.
 */
export async function clientToken(env: IdentityApiEnv, refresh = false): Promise<string> {
	const clientId = env.IDENTITY_API_CLIENT_ID;
	const clientSecret = env.IDENTITY_API_CLIENT_SECRET;
	if (!clientId || !clientSecret) {
		throw new Error("identity API client isn't configured");
	}

	if (!refresh && cachedToken && Date.now() < cachedToken.expiresAt) {
		return cachedToken.value;
	}

	const response = await fetch(`${env.IDENTITY_URL ?? baseUrl()}/oauth/token`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			grant_type: 'client_credentials',
			client_id: clientId,
			client_secret: clientSecret
		}).toString(),
		signal: AbortSignal.timeout(5000)
	});
	if (!response.ok) {
		throw await refused('token request', response);
	}

	const { access_token, expires_in } = z
		.object({ access_token: z.string(), expires_in: z.number() })
		.parse(await response.json());
	cachedToken = { value: access_token, expiresAt: Date.now() + (expires_in - 60) * 1000 };
	return access_token;
}

/** The fields of `PATCH /api/users/{cid}` that community writes; null clears one. */
export type IdentityUserPatch = {
	preferred_name?: string | null;
	pronouns?: string | null;
	operating_initials?: string | null;
};

/** Patches a member in identity with the API client's token. A refusal throws `IdentityApiError`. */
export async function patchIdentityUser(
	env: IdentityApiEnv,
	cid: string,
	patch: IdentityUserPatch,
	what = 'user write'
): Promise<void> {
	const send = async (token: string) =>
		fetch(`${env.IDENTITY_URL ?? baseUrl()}/api/users/${encodeURIComponent(cid)}`, {
			method: 'PATCH',
			headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
			body: JSON.stringify(patch),
			signal: AbortSignal.timeout(5000)
		});

	let response = await send(await clientToken(env));
	if (response.status === 401) {
		response = await send(await clientToken(env, true));
	}
	if (!response.ok) {
		throw await refused(what, response);
	}
}

/** Sets (or with null, clears) a member's operating initials in identity. */
export async function writeOperatingInitials(
	env: IdentityApiEnv,
	cid: string,
	initials: string | null
): Promise<void> {
	await patchIdentityUser(env, cid, { operating_initials: initials }, 'initials write');
}

/** The fields a member may change about themselves; null clears one. */
export type OwnProfilePatch = { preferred_name?: string | null; pronouns?: string | null };

/**
 * Changes the signed-in member's own preferred name and pronouns: `PATCH /api/me` with their
 * session's identity token (`identityToken`), which identity requires there; a client token is
 * refused.
 */
export async function updateOwnProfile(
	env: IdentityApiEnv,
	accessToken: string,
	patch: OwnProfilePatch
): Promise<void> {
	const response = await fetch(`${env.IDENTITY_URL ?? baseUrl()}/api/me`, {
		method: 'PATCH',
		headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
		body: JSON.stringify(patch),
		signal: AbortSignal.timeout(5000)
	});
	if (!response.ok) {
		throw await refused('profile update', response);
	}
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

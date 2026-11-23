import { z } from 'zod';
import {
	IdentityApiError,
	patchIdentityUser,
	type IdentityApiEnv,
	type IdentityUserPatch
} from './identity';

export const PREFERRED_NAME_MAX = 64;
export const PRONOUNS_MAX = 32;
const INITIALS = /^[A-Z]{2}$/;

export type CopyUser = {
	cid: string;
	firstName: string;
	lastName: string;
	preferredName: string | null;
	pronouns: string | null;
	operatingInitials: string | null;
};

/** Where the copy reads community's members and updates a member's initials. */
export type CopyStore = {
	users(): Promise<CopyUser[]>;
	setOperatingInitials(cid: string, initials: string): Promise<void>;
	/** Clears a member's preferred name, for an old one equal to their full name. */
	clearPreferredName(cid: string): Promise<void>;
};

export const TeachersSchema = z.array(
	z.object({
		cid: z.union([z.string(), z.number()]).transform(String),
		initials: z.string()
	})
);

export type CopyReport = {
	patched: number;
	droppedFullNames: number;
	cuts: string[];
	skippedUnknown: string[];
	skippedMalformed: string[];
	/** Teacher-file entries ("cid (XX)") with no community row: their initials aren't copied. */
	teachersWithoutAccount: string[];
	/** CIDs whose teacher-file initials are empty. */
	emptyTeacherInitials: string[];
	/** Members identity refused with an error other than 404 ("cid: message"). */
	failed: string[];
	localInitialsUpdated: string[];
	/** CIDs whose preferred name equal to the full name was cleared in community's row. */
	localFullNamesCleared: string[];
	patches: { cid: string; patch: IdentityUserPatch }[];
};

const cut = (value: string, max: number) => (value.length > max ? value.slice(0, max) : value);

/** What to send for one member, with notes for the report. */
export function buildPatch(user: CopyUser, teacherInitials: string | undefined) {
	const patch: IdentityUserPatch = {};
	const cuts: string[] = [];
	const malformed: string[] = [];
	let droppedFullName = false;

	const preferred = user.preferredName?.trim() ?? '';
	if (preferred !== '') {
		const fullName = `${user.firstName} ${user.lastName}`.trim();
		if (preferred.toLowerCase() === fullName.toLowerCase()) {
			patch.preferred_name = null;
			droppedFullName = true;
		} else {
			patch.preferred_name = cut(preferred, PREFERRED_NAME_MAX);
			if (patch.preferred_name !== preferred) {
				cuts.push(
					`${user.cid}: preferred name cut from ${preferred.length} to ${PREFERRED_NAME_MAX}`
				);
			}
		}
	}

	const pronouns = user.pronouns?.trim() ?? '';
	patch.pronouns = pronouns === '' ? null : cut(pronouns, PRONOUNS_MAX);
	if (pronouns.length > PRONOUNS_MAX) {
		cuts.push(`${user.cid}: pronouns cut from ${pronouns.length} to ${PRONOUNS_MAX}`);
	}

	const initials = teacherInitials ?? user.operatingInitials;
	if (initials !== null && initials !== undefined && initials !== '') {
		if (INITIALS.test(initials)) {
			patch.operating_initials = initials;
		} else {
			malformed.push(`${user.cid}: initials "${initials}" don't match ^[A-Z]{2}$`);
		}
	}

	return { patch, cuts, malformed, droppedFullName };
}

/**
 * Copies community's preferred names, pronouns and initials into identity, one PATCH per member
 * through the shared API client token. With `dryRun` nothing is written anywhere.
 */
export async function copyProfiles(options: {
	env: IdentityApiEnv;
	store: CopyStore;
	teachers: { cid: string; initials: string }[];
	dryRun: boolean;
}): Promise<CopyReport> {
	const { env, store, teachers, dryRun } = options;
	const teacherByCid = new Map(teachers.map((teacher) => [teacher.cid, teacher.initials]));
	const report: CopyReport = {
		patched: 0,
		droppedFullNames: 0,
		cuts: [],
		skippedUnknown: [],
		skippedMalformed: [],
		teachersWithoutAccount: [],
		emptyTeacherInitials: [],
		failed: [],
		localInitialsUpdated: [],
		localFullNamesCleared: [],
		patches: []
	};

	const users = await store.users();
	const userCids = new Set(users.map((user) => user.cid));
	for (const { cid, initials } of teachers) {
		if (initials.trim() === '') report.emptyTeacherInitials.push(cid);
		else if (!userCids.has(cid)) report.teachersWithoutAccount.push(`${cid} (${initials})`);
	}

	for (const user of users) {
		if (!user.cid) continue;
		const teacher = teacherByCid.get(user.cid);
		const { patch, cuts, malformed, droppedFullName } = buildPatch(user, teacher);
		report.cuts.push(...cuts);
		report.skippedMalformed.push(...malformed);
		if (droppedFullName) report.droppedFullNames += 1;
		report.patches.push({ cid: user.cid, patch });

		if (dryRun) continue;

		// The old settings page pre-filled "First Last". Community's pages now take a preferred
		// name equal to the full name as a real choice, so clear these locally too, even for a
		// member identity doesn't know: left, they would show a private member's last name.
		if (droppedFullName) {
			await store.clearPreferredName(user.cid);
			report.localFullNamesCleared.push(user.cid);
		}

		try {
			await patchIdentityUser(env, user.cid, patch, 'profile copy');
		} catch (error) {
			if (error instanceof IdentityApiError && error.status === 404) {
				report.skippedUnknown.push(user.cid);
			} else {
				report.failed.push(
					`${user.cid}: ${error instanceof Error ? error.message : String(error)}`
				);
			}
			continue;
		}
		report.patched += 1;

		if (
			teacher !== undefined &&
			patch.operating_initials === teacher &&
			teacher !== user.operatingInitials
		) {
			await store.setOperatingInitials(user.cid, teacher);
			report.localInitialsUpdated.push(user.cid);
		}
	}

	return report;
}

// One-time copy of community's preferred names, pronouns and operating initials into identity.
// Run through `npm run copy-profiles -- [--dry-run] --teachers <file.json>`; see the README.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import {
	copyProfiles,
	TeachersSchema,
	type CopyReport,
	type CopyStore,
	type CopyUser
} from '../src/lib/server/copyProfiles';

const DATABASE = 'website-db';

function d1(sql: string): Record<string, unknown>[] {
	const output = execFileSync(
		'npx',
		['wrangler', 'd1', 'execute', DATABASE, '--remote', '--json', '--command', sql],
		{ encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
	);
	const [result] = JSON.parse(output) as { results: Record<string, unknown>[] }[];
	return result.results;
}

/** Community's production D1, read and updated through wrangler. */
const wranglerStore: CopyStore = {
	async users() {
		return d1(
			`SELECT cid, first_name, last_name, preferred_name, pronouns, operating_initials
			 FROM users WHERE cid IS NOT NULL AND cid != '' ORDER BY cid`
		).map(
			(row): CopyUser => ({
				cid: String(row.cid),
				firstName: String(row.first_name ?? ''),
				lastName: String(row.last_name ?? ''),
				preferredName: (row.preferred_name as string | null) ?? null,
				pronouns: (row.pronouns as string | null) ?? null,
				operatingInitials: (row.operating_initials as string | null) ?? null
			})
		);
	},
	async setOperatingInitials(cid, initials) {
		// Both are checked here because they go into the statement's text.
		if (!/^\d+$/.test(cid) || !/^[A-Z]{2}$/.test(initials)) {
			throw new Error(`Refusing to update ${cid}: unexpected cid or initials`);
		}
		d1(`UPDATE users SET operating_initials = '${initials}' WHERE cid = '${cid}'`);
	}
};

function print(title: string, lines: string[]) {
	console.log(`\n${title}: ${lines.length}`);
	for (const line of lines) console.log(`  ${line}`);
}

function printReport(report: CopyReport, dryRun: boolean) {
	if (dryRun) {
		console.log('Dry run: nothing was written.');
		for (const { cid, patch } of report.patches) console.log(`PATCH ${cid} ${JSON.stringify(patch)}`);
	}
	console.log(`\nMembers patched: ${report.patched}`);
	console.log(`Full names dropped: ${report.droppedFullNames}`);
	print('Cuts', report.cuts);
	print('Skipped, unknown to identity', report.skippedUnknown);
	print('Skipped, malformed', report.skippedMalformed);
	print('Local initials updated from the teacher file', report.localInitialsUpdated);
}

const { values } = parseArgs({
	options: { 'dry-run': { type: 'boolean', default: false }, teachers: { type: 'string' } }
});
if (!values.teachers) {
	console.error('Usage: npm run copy-profiles -- [--dry-run] --teachers <file.json>');
	process.exit(2);
}

const teachers = TeachersSchema.parse(JSON.parse(readFileSync(values.teachers, 'utf8')));
const dryRun = values['dry-run'] ?? false;

// `process.env` is the Worker's `env` here: IDENTITY_URL, IDENTITY_API_CLIENT_ID and
// IDENTITY_API_CLIENT_SECRET, handed to the same `clientToken()` the site uses.
printReport(await copyProfiles({ env: process.env, store: wranglerStore, teachers, dryRun }), dryRun);

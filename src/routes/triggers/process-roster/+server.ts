import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { fetchRoster } from '$lib/server/vatsim/vatusaDataClient';
import { vatsimControllersTable, usersTable } from '$lib/db/schema';
import { refreshCertifications } from '$lib/server/certification';
import { syncUserMembership } from '$lib/server/user';

const ARTCC_ID = 'ZID';

export const GET: RequestHandler = async ({ locals }) => {
	const startTime = performance.now();
	console.log(`[${new Date().toISOString()}] Starting roster processing`);

	// Fetch fresh roster data
	const fetchStartTime = performance.now();
	const roster = await fetchRoster(ARTCC_ID);
	const fetchEndTime = performance.now();
	console.log(`⏱️ VATUSA API fetch took ${(fetchEndTime - fetchStartTime).toFixed(2)}ms`);

	const now = new Date().toISOString();
	let rosterUpdated = 0;

	console.log(`Fetched ${roster.length} roster members from VATUSA`);

	// Process: COMPARE + UPDATE + SYNC MEMBERSHIPS + REFRESH CERTIFICATES
	// 1. Get current roster for comparison
	const currentRoster = await locals.db
		.select({ cid: vatsimControllersTable.cid })
		.from(vatsimControllersTable);
	const currentCids = new Set(currentRoster.map((c) => c.cid));

	// 2. TRUNCATE rostered_controllers
	const truncateStartTime = performance.now();
	console.log('🗑️ Truncating existing roster...');
	await locals.db.delete(vatsimControllersTable);
	const truncateEndTime = performance.now();
	console.log(`⏱️ Truncate took ${(truncateEndTime - truncateStartTime).toFixed(2)}ms`);

	// 3. ADD ALL CONTROLLERS FROM API
	const insertStartTime = performance.now();
	console.log(`📥 Adding ${roster.length} controllers from API...`);
	const rosterValues = roster.map((member) => ({
		data: member,
		cid: String(member.cid)
	}));
	const newCids = new Set(rosterValues.map((r) => r.cid));

	// Use D1's batch API for efficient bulk operations
	const insertStatements = rosterValues.map((member) =>
		locals.db.insert(vatsimControllersTable).values(member)
	);

	const batchResults = await locals.db.batch(insertStatements as any);
	rosterUpdated = batchResults.length;
	const insertEndTime = performance.now();
	console.log(
		`⏱️ D1 batch insert of ${roster.length} members took ${(insertEndTime - insertStartTime).toFixed(2)}ms`
	);

	// 4. Determine membership changes - check actual user membership status
	const allUsers = await locals.db
		.select({ cid: usersTable.cid, membership: usersTable.membership })
		.from(usersTable);
	const userMembershipMap = new Map(allUsers.map((u) => [u.cid, u.membership]));

	// Find users currently NOT controllers that appear in the controllers table (promote)
	const promoted = [...newCids].filter((cid) => {
		const currentMembership = userMembershipMap.get(cid);
		return currentMembership && currentMembership !== 'controller';
	});

	// Find users currently controllers that are NOT in the new controllers table (demote)
	const demoted = allUsers
		.filter((user) => user.membership === 'controller' && !newCids.has(user.cid))
		.map((user) => user.cid);

	console.log(`📈 ${promoted.length} users promoted to controller`);
	console.log(`📉 ${demoted.length} users demoted from controller`);

	// 5. Sync membership for changed users only
	let syncedUsers = 0;
	const changedUsers = [...promoted, ...demoted];

	if (changedUsers.length > 0) {
		console.log(`🔄 Syncing membership for ${changedUsers.length} users...`);
		const syncStartTime = performance.now();

		for (const cid of changedUsers) {
			const syncedUser = await syncUserMembership(locals.db, cid);
			if (syncedUser) syncedUsers++;
		}

		const syncEndTime = performance.now();
		console.log(`⏱️ Membership sync took ${(syncEndTime - syncStartTime).toFixed(2)}ms`);
		console.log(`✅ Synced membership for ${syncedUsers} users`);
	} else {
		console.log('ℹ️ No membership changes detected');
	}

	console.log(`📝 Certificate processing deferred to SSO login for better performance`);

	const endTime = performance.now();
	const totalTime = endTime - startTime;
	console.log(`Updated ${rosterUpdated} roster members`);
	console.log(
		`⏱️ TOTAL PROCESSING TIME: ${totalTime.toFixed(2)}ms (${(totalTime / 1000).toFixed(2)}s)`
	);
	console.log(`[${new Date().toISOString()}] Roster processing complete`);

	console.log(`[${new Date().toISOString()}] Starting certificate refresh`);

	const updatedCertifications = await refreshCertifications(locals.db);

	console.log(`Updated ${updatedCertifications.length} certifications`);

	console.log(`[${new Date().toISOString()}] Certificate refresh processing complete`);

	return json({
		message: 'Roster processed successfully',
		roster_members_updated: rosterUpdated,
		users_synced: syncedUsers,
		promoted_users: promoted.length,
		demoted_users: demoted.length,
		total_time_ms: Math.round(totalTime),
		processed_at: now
	});
};

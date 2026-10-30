import { beforeEach, describe, expect, it } from 'vitest';
import { Role } from '$lib/utils/permissions';
import type { Database } from '$lib/server/db';
import {
	AVAILABLE_CREDENTIALS,
	seedAvailableCredentials,
	seedMember,
	testDb
} from '$lib/testing/db';
import { callLoad } from '$lib/testing/site';
import { load as loadList } from './+page.server';
import { load as loadUser, actions } from './[id]/+page.server';

let db: Database;

beforeEach(async () => {
	db = await testDb();
	await seedAvailableCredentials(db);
	await seedMember(db, {
		cid: '1000001',
		firstName: 'Jane',
		lastName: 'Example',
		certification: 'T-RC',
		endorsements: ['T2-CTR', 'S-LC'],
		user: { id: 'user-jane', email: 'jane@private.example.test' }
	});
	// A site account that isn't on the controller roster
	await seedMember(db, {
		cid: '1000002',
		firstName: 'Sam',
		lastName: 'Visitor',
		onRoster: false,
		user: { id: 'user-sam', email: 'sam@private.example.test', membership: 'community' }
	});
});

const admin = () => ({ db, roles: [Role.ADMIN], user: { id: 'admin-1' } });

function visit(id: string) {
	return callLoad(loadUser, { params: { id }, locals: admin() });
}

function post(action: string, id: string, fields: Record<string, string> = {}) {
	const handler = (actions as Record<string, unknown>)[action] as
		| ((event: unknown) => Promise<unknown>)
		| undefined;
	return handler?.({
		params: { id },
		locals: admin(),
		request: new Request('https://flyindycenter.com/', {
			method: 'POST',
			body: new URLSearchParams(fields)
		})
	});
}

describe('/admin/users/[id]', () => {
	it("sends a controller's credentials from the roster copy, with the names to show them", async () => {
		const data = (await visit('user-jane')) as Awaited<ReturnType<typeof loadUser>> & {
			held: unknown;
			credentials: unknown;
		};

		expect(data.held).toEqual({ certification: 'T-RC', endorsements: ['T2-CTR', 'S-LC'] });
		expect(data.credentials).toEqual(AVAILABLE_CREDENTIALS);
	});

	it("has no certification or endorsement rows on the user, so the page can't edit them", async () => {
		const data = (await visit('user-jane')) as { user: Record<string, unknown> };

		expect(data.user).not.toHaveProperty('certifications');
		expect(data.user).not.toHaveProperty('endorsements');
	});

	it("sends no held credentials for a user who isn't on the controller roster", async () => {
		const data = (await visit('user-sam')) as { held: unknown };

		expect(data.held).toBeNull();
	});

	it('still loads when the stored copy is empty', async () => {
		const empty = await testDb();
		await seedMember(empty, {
			cid: '1000003',
			firstName: 'Robin',
			lastName: 'Example',
			onRoster: false,
			user: { id: 'user-robin', email: 'robin@private.example.test' }
		});

		const data = (await callLoad(loadUser, {
			params: { id: 'user-robin' },
			locals: { db: empty, roles: [Role.ADMIN] }
		})) as { held: unknown; credentials: unknown };

		expect(data.held).toBeNull();
		expect(data.credentials).toEqual([]);
	});

	it('has no setCertification or toggleEndorsement action, so posting to them is a 404', () => {
		expect(post('setCertification', 'user-jane')).toBeUndefined();
		expect(post('toggleEndorsement', 'user-jane', { endorsement: 'S-LC' })).toBeUndefined();
		expect(Object.keys(actions)).toEqual(['toggleRole']);
	});

	it('still toggles a role', async () => {
		await post('toggleRole', 'user-jane', { role: Role.CAN_MANAGE_EVENTS });
		let data = (await visit('user-jane')) as { user: { roles: { role: string }[] } };
		expect(data.user.roles.map((r) => r.role)).toEqual([Role.CAN_MANAGE_EVENTS]);

		await post('toggleRole', 'user-jane', { role: Role.CAN_MANAGE_EVENTS });
		data = (await visit('user-jane')) as { user: { roles: { role: string }[] } };
		expect(data.user.roles).toEqual([]);
	});
});

describe('/admin/users', () => {
	it('lists users with their roles and no credentials', async () => {
		const data = (await callLoad(loadList, { locals: admin() })) as {
			users: Record<string, unknown>[];
		};

		expect(data.users).toHaveLength(2);
		for (const user of data.users) {
			expect(user).toHaveProperty('roles');
			expect(user).not.toHaveProperty('certifications');
			expect(user).not.toHaveProperty('endorsements');
		}
	});
});

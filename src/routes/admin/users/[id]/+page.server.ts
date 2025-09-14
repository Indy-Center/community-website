import { userEndorsementsTable } from '$lib/db/schema/endorsements';
import { userCertificationsTable } from '$lib/db/schema/certifications';
import { usersTable } from '$lib/db/schema/users';
import { eq, and } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import { isAdmin } from '$lib/utils/permissions';
import { redirect } from '@sveltejs/kit';

export const load = async ({ params, locals }) => {
	if (!isAdmin(locals.roles)) {
		return redirect(302, '/admin');
	}

	const { id } = params;

	const user = await locals.db.query.usersTable.findFirst({
		where: eq(usersTable.id, id),
		with: {
			roles: true,
			certifications: true,
			endorsements: true
		}
	});

	if (!user) {
		return redirect(302, '/admin/users');
	}

	return {
		user
	};
};

export const actions = {
	toggleCertification: async ({ request, locals, params }) => {
		if (!isAdmin(locals.roles)) {
			return fail(403, { message: 'Unauthorized' });
		}

		const { id } = params;
		const formData = await request.formData();
		const certification = formData.get('certification') as string;

		if (!certification) {
			return fail(400, { message: 'Certification is required' });
		}

		try {
			// Check if the certification exists
			const existingCert = await locals.db.query.userCertificationsTable.findFirst({
				where: and(
					eq(userCertificationsTable.userId, id),
					eq(userCertificationsTable.certification, certification)
				)
			});

			if (existingCert) {
				// Remove certification
				await locals.db
					.delete(userCertificationsTable)
					.where(
						and(
							eq(userCertificationsTable.userId, id),
							eq(userCertificationsTable.certification, certification)
						)
					);
			} else {
				// Add certification
				await locals.db.insert(userCertificationsTable).values({
					userId: id,
					certification: certification
				});
			}

			return { success: true };
		} catch (error) {
			return fail(500, { message: 'Failed to toggle certification' });
		}
	},

	toggleEndorsement: async ({ request, locals, params }) => {
		if (!isAdmin(locals.roles)) {
			return fail(403, { message: 'Unauthorized' });
		}

		const { id } = params;
		const formData = await request.formData();
		const endorsement = formData.get('endorsement') as string;

		if (!endorsement) {
			return fail(400, { message: 'Endorsement is required' });
		}

		try {
			// Check if the endorsement exists
			const existingEndorsement = await locals.db.query.userEndorsementsTable.findFirst({
				where: and(
					eq(userEndorsementsTable.userId, id),
					eq(userEndorsementsTable.endorsement, endorsement)
				)
			});

			if (existingEndorsement) {
				// Remove endorsement
				await locals.db
					.delete(userEndorsementsTable)
					.where(
						and(
							eq(userEndorsementsTable.userId, id),
							eq(userEndorsementsTable.endorsement, endorsement)
						)
					);
			} else {
				// Add endorsement
				await locals.db.insert(userEndorsementsTable).values({
					userId: id,
					endorsement: endorsement
				});
			}

			return { success: true };
		} catch (error) {
			return fail(500, { message: 'Failed to toggle endorsement' });
		}
	}
};

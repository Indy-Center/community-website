import { userEndorsementsTable } from '$lib/db/schema/endorsements';
import { userCertificationsTable } from '$lib/db/schema/certifications';
import { userRolesTable } from '$lib/db/schema/roles';
import { usersTable } from '$lib/db/schema/users';
import { eq, and } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import { isAdmin } from '$lib/utils/permissions';
import { redirect } from '@sveltejs/kit';
import { logger } from '$lib/server/logger';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { z } from 'zod';

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

const setCertificationSchema = z.object({
	certification: z.string().optional()
});

const toggleEndorsementSchema = z.object({
	endorsement: z.string().min(1)
});

const toggleRoleSchema = z.object({
	role: z.string().min(1)
});

export const actions = {
	setCertification: async ({ request, locals, params }) => {
		if (!isAdmin(locals.roles)) {
			logger.warn(`Unauthorized certification change attempt by user ${locals.user?.id} for target user ${params.id}`);
			return fail(403, { message: 'Unauthorized' });
		}

		const { id } = params;
		const form = await superValidate(request, zod4(setCertificationSchema));

		if (!form.valid) {
			return fail(400, { form, message: 'Invalid certification data' });
		}

		const certification = form.data.certification;

		logger.info(`Admin ${locals.user?.id} changing certification for user ${id} to: ${certification || 'none'}`);

		try {
			// Get current certification to check if we need to remove T2-CTR endorsement
			const currentCert = await locals.db.query.userCertificationsTable.findFirst({
				where: eq(userCertificationsTable.userId, id)
			});

			// Remove all existing certifications for this user
			await locals.db.delete(userCertificationsTable).where(eq(userCertificationsTable.userId, id));

			// Remove T2-CTR endorsement if user had E-RC and is changing to something else
			if (currentCert?.certification === 'E-RC' && certification !== 'E-RC') {
				await locals.db
					.delete(userEndorsementsTable)
					.where(
						and(
							eq(userEndorsementsTable.userId, id),
							eq(userEndorsementsTable.endorsement, 'T2-CTR')
						)
					);
			}

			// Add new certification (if not empty string)
			if (certification) {
				await locals.db.insert(userCertificationsTable).values({
					userId: id,
					certification: certification
				});

				// If setting E-RC certification, also add T2-CTR endorsement
				if (certification === 'E-RC') {
					// Check if T2-CTR endorsement already exists to avoid duplicates
					const existingEndorsement = await locals.db.query.userEndorsementsTable.findFirst({
						where: and(
							eq(userEndorsementsTable.userId, id),
							eq(userEndorsementsTable.endorsement, 'T2-CTR')
						)
					});

					if (!existingEndorsement) {
						await locals.db.insert(userEndorsementsTable).values({
							userId: id,
							endorsement: 'T2-CTR'
						});
					}
				}
			}

			logger.info(`Certification successfully updated for user ${id} by admin ${locals.user?.id}`);
			return { success: true };
		} catch (error) {
			logger.error(`Failed to set certification for user ${id} by admin ${locals.user?.id}`, error);
			return fail(500, { message: 'Failed to set certification' });
		}
	},

	toggleEndorsement: async ({ request, locals, params }) => {
		if (!isAdmin(locals.roles)) {
			logger.warn(`Unauthorized endorsement change attempt by user ${locals.user?.id} for target user ${params.id}`);
			return fail(403, { message: 'Unauthorized' });
		}

		const { id } = params;
		const form = await superValidate(request, zod4(toggleEndorsementSchema));

		if (!form.valid) {
			return fail(400, { form, message: 'Endorsement is required' });
		}

		const endorsement = form.data.endorsement;

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
				logger.info(`Admin ${locals.user?.id} removing endorsement ${endorsement} from user ${id}`);
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
				logger.info(`Admin ${locals.user?.id} adding endorsement ${endorsement} to user ${id}`);
				await locals.db.insert(userEndorsementsTable).values({
					userId: id,
					endorsement: endorsement
				});
			}

			logger.info(`Endorsement ${endorsement} successfully toggled for user ${id} by admin ${locals.user?.id}`);
			return { success: true };
		} catch (error) {
			logger.error(`Failed to toggle endorsement ${endorsement} for user ${id} by admin ${locals.user?.id}`, error);
			return fail(500, { message: 'Failed to toggle endorsement' });
		}
	},

	toggleRole: async ({ request, locals, params }) => {
		if (!isAdmin(locals.roles)) {
			logger.warn(`Unauthorized role change attempt by user ${locals.user?.id} for target user ${params.id}`);
			return fail(403, { message: 'Unauthorized' });
		}

		const { id } = params;
		const form = await superValidate(request, zod4(toggleRoleSchema));

		if (!form.valid) {
			return fail(400, { form, message: 'Role is required' });
		}

		const role = form.data.role;

		try {
			// Check if the role exists
			const existingRole = await locals.db.query.userRolesTable.findFirst({
				where: and(eq(userRolesTable.userId, id), eq(userRolesTable.role, role))
			});

			if (existingRole) {
				// Remove role
				logger.info(`Admin ${locals.user?.id} removing role ${role} from user ${id}`);
				await locals.db
					.delete(userRolesTable)
					.where(and(eq(userRolesTable.userId, id), eq(userRolesTable.role, role)));
			} else {
				// Add role
				logger.info(`Admin ${locals.user?.id} adding role ${role} to user ${id}`);
				await locals.db.insert(userRolesTable).values({
					userId: id,
					role: role
				});
			}

			logger.info(`Role ${role} successfully toggled for user ${id} by admin ${locals.user?.id}`);
			return { success: true };
		} catch (error) {
			logger.error(`Failed to toggle role ${role} for user ${id} by admin ${locals.user?.id}`, error);
			return fail(500, { message: 'Failed to toggle role' });
		}
	}
};

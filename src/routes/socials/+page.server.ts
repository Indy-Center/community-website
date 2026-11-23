import { socialSteps } from '$lib/server/socials';

export const load = async ({ locals, platform }) => {
	return { steps: await socialSteps(platform?.env.LARRY, locals.user ?? null) };
};

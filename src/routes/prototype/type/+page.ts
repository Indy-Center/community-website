// PROTOTYPE (prototype/type): only under `vite dev`.
import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';

export const load = () => {
	if (!dev) error(404, 'Not found');
};

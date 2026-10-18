// PROTOTYPE (prototype/chrome): stand-in pages for training and the library,
// so moving between apps can be tried. Only under `vite dev`.
import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';
import { mockPage, type AppKey } from '$lib/prototype/chrome/chrome';

export const load = ({ params }) => {
	if (!dev || (params.app !== 'training' && params.app !== 'library')) error(404, 'Not found');
	const app = params.app as AppKey;
	const page = mockPage(app, params.path);
	if (!page) error(404, 'Not found');
	return { app, page };
};

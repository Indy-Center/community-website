import { redirect } from '@sveltejs/kit';

// Settings live on the profile page now, in its edit mode. A browser keeps the `#` anchor of the
// old address through the redirect, so /settings#controlling lands on /profile?edit#controlling.
export const GET = () => redirect(302, '/profile?edit');

// Its form is gone; nothing is saved here
export const POST = () =>
	new Response('Settings are saved on /profile.', { status: 405, headers: { Allow: 'GET' } });

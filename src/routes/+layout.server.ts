import type { Cookies } from '@sveltejs/kit';

export function load({ locals, cookies }: { locals: App.Locals; cookies: Cookies }) {
	return {
		user: locals.user,
		roles: locals.roles,
		session: locals.session,
		// PROTOTYPE (prototype/chrome): the choices made on the chrome bar.
		chromePrototype: cookies.get('chrome-prototype') ?? ''
	};
}

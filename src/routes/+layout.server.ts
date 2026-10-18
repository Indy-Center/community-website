import type { Cookies } from '@sveltejs/kit';

export function load({ locals, cookies }: { locals: App.Locals; cookies: Cookies }) {
	return {
		user: locals.user,
		roles: locals.roles,
		session: locals.session,
		// PROTOTYPE (prototype/type): the choices made on the type bar.
		typePrototype: cookies.get('type-prototype') ?? ''
	};
}

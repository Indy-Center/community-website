import type { Cookies } from '@sveltejs/kit';

export function load({ locals, cookies }: { locals: App.Locals; cookies: Cookies }) {
	return {
		user: locals.user,
		roles: locals.roles,
		session: locals.session,
		// PROTOTYPE (prototype/palette): the palette chosen on the switcher bar.
		palettePrototype: cookies.get('palette-prototype') ?? ''
	};
}

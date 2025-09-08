export function load({ locals }: { locals: App.Locals }) {
	return {
		user: locals.user,
		roles: locals.roles,
		session: locals.session
	};
}

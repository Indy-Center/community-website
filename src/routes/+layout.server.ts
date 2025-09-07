export function load({ locals }: { locals: App.Locals }) {
	return {
		user: locals.user,
		userVatsimData: locals.userVatsimData,
		session: locals.session
	};
}

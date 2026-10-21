// Sent to the browser on every page. No page needs the session, and its data holds the
// visitor's identity access token, so it stays on the server.
export function load({ locals }: { locals: App.Locals }) {
	return {
		user: locals.user,
		roles: locals.roles
	};
}

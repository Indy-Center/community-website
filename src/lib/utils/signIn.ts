/** The sign-in link that brings the user back to `returnPath` once they have signed in. */
export function signInHref(returnPath: string) {
	return `/login/connect?returnUrl=${encodeURIComponent(returnPath)}`;
}

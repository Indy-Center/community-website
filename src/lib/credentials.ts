// Credentials as the training app defines them, stored by the roster refresh. Safe for the
// browser: pages are sent the available credentials and use these to show and sort them.

/** One available credential: what the site stores and serves of the training app's definition. */
export type AvailableCredential = {
	code: string;
	kind: 'certification' | 'endorsement';
	name: string;
	/** Position in the ladder, from 1: certifications lowest to highest, then endorsements. */
	order: number;
};

/** A credential's full name, or its code when it isn't among the available credentials. */
export function credentialName(
	credentials: Pick<AvailableCredential, 'code' | 'name'>[],
	code: string
) {
	return credentials.find((credential) => credential.code === code)?.name ?? code;
}

/**
 * Where a credential sorts: its `order`, 0 for none (below every credential), and after every
 * available credential for a code that isn't one.
 */
export function credentialOrder(
	credentials: Pick<AvailableCredential, 'code' | 'order'>[],
	code: string | null
) {
	if (code === null) return 0;
	return (
		credentials.find((credential) => credential.code === code)?.order ?? Number.MAX_SAFE_INTEGER
	);
}

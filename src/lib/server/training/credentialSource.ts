// Where a controller's training-tools credentials (S-GC, A-LC, S-LC, ...) are read from. How we
// reach training-tools (identity, an RPC binding, or an HTTP route) isn't decided yet, so callers
// depend on this and only getCredentialSource changes once it is.
export interface CredentialSource {
	// The credential codes held by a CID, or null when they couldn't be determined. Callers must
	// treat null as "unknown" and never as "holds nothing".
	getHeldCredentials(cid: string): Promise<string[] | null>;
}

// Null until a transport is chosen
export function getCredentialSource(): CredentialSource | null {
	return null;
}

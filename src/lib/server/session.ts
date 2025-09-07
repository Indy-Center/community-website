import { userSessionsTable, usersTable } from '$lib/server/db/schema';
import { sha256 } from '@oslojs/crypto/sha2';
import { encodeBase32LowerCaseNoPadding, encodeHexLowerCase } from '@oslojs/encoding';
import type { User } from '$lib/server/user';

import { eq } from 'drizzle-orm';
import type { RequestEvent } from '@sveltejs/kit';
import type { Database } from '$lib/server/db';
import { addDays } from 'date-fns';

export function generateSessionToken(): string {
	return encodeBase32LowerCaseNoPadding(crypto.getRandomValues(new Uint8Array(20)));
}

export async function createSession(token: string, id: string, db: Database): Promise<Session> {
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));

	const session = {
		id: sessionId,
		userId: id,
		expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
	};

	await db.insert(userSessionsTable).values({
		id: session.id,
		userId: session.userId,
		expiresAt: session.expiresAt
	});

	return session;
}

export async function validateSessionToken(
	token: string,
	db: Database
): Promise<SessionValidationResult> {
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));

	// First, just get the session
	const existingSession = await db.query.userSessionsTable.findFirst({
		where: eq(userSessionsTable.id, sessionId)
	});

	if (!existingSession) {
		return { session: null, user: null };
	}

	// Then get the user with all related data
	const user = await db.query.usersTable.findFirst({
		where: eq(usersTable.id, existingSession.userId),
		with: {
			controller: true,
			certifications: true,
			endorsements: true,
			roles: true
		}
	});

	if (!user) {
		// Session exists but user doesn't - clean up the orphaned session
		await db.delete(userSessionsTable).where(eq(userSessionsTable.id, sessionId));
		return { session: null, user: null };
	}

	const session = {
		id: existingSession.id,
		userId: existingSession.userId,
		expiresAt: existingSession.expiresAt
	};

	if (Date.now() >= session.expiresAt.getTime()) {
		await db.delete(userSessionsTable).where(eq(userSessionsTable.id, sessionId));
		return { session: null, user: null };
	}

	if (Date.now() >= session.expiresAt.getTime() - 1000 * 60 * 60 * 24 * 15) {
		session.expiresAt = addDays(session.expiresAt, 30);

		await db
			.update(userSessionsTable)
			.set({
				expiresAt: session.expiresAt
			})
			.where(eq(userSessionsTable.id, sessionId));
	}

	return { session, user };
}

export async function invalidateSession(sessionId: string, db: Database) {
	await db.delete(userSessionsTable).where(eq(userSessionsTable.id, sessionId));
}

export function setSessionTokenCookie(event: RequestEvent, token: string, expiresAt: Date): void {
	event.cookies.set('session', token, {
		httpOnly: true,
		sameSite: 'lax',
		expires: expiresAt,
		path: '/'
	});
}

export function deleteSessionTokenCookie(event: RequestEvent): void {
	event.cookies.set('session', '', {
		httpOnly: true,
		sameSite: 'lax',
		maxAge: 0,
		path: '/'
	});
}

export type Session = {
	id: string;
	userId: string;
	expiresAt: Date;
};

export type SessionValidationResult =
	| { session: Session; user: User }
	| { session: null; user: null };

// Re-export User type for convenience
export type { User } from '$lib/server/user';

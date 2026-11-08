import { z } from 'zod';
import { logger } from '$lib/server/logger';
import { partnersDocument, type ReadPartnersDocument } from './schema';

/**
 * Everything the site reads from the CMS, and the only place that talks to it. Modelled on
 * indy-library's client (`src/lib/server/cms/index.ts` there), but reads only the partners
 * document, the one thing the site needs.
 *
 * The document is kept for a few minutes (`FRESH_MS`) so pages are quick and the CMS is not asked
 * on every request. When the CMS cannot be reached, answers with an error, takes too long, or answers
 * with something that is not the document asked for, the last good copy is served instead for as
 * long as `KEEP_MS`, so a CMS outage does not take the partners page down. Only a document of the
 * right shape is ever kept, and a kept copy is checked again before it is served. Only with no copy at all does a read fail, with `CmsUnavailableError`.
 *
 * The document includes member perks. It is kept server-side only; pages read it through
 * `readPartners` (`$lib/server/partners`), which decides what each visitor is sent.
 */
export type Cms = {
	/** Every published partner, grouped by partner category, in order. */
	partners(): Promise<ReadPartnersDocument>;
};

/** A document as it was fetched, and when. */
export type KeptCopy = { fetchedAt: number; body: unknown };

/** Where the copy is kept. The Workers Cache API in production, memory in tests and `vite dev`. */
export type CopyStore = {
	get(): Promise<KeptCopy | undefined>;
	put(copy: KeptCopy): Promise<void>;
};

export class CmsUnavailableError extends Error {
	/**
	 * Why the CMS could not be read, in a line fit for the log: the status it answered with, the
	 * fields that failed the shape check, the timeout, or the fetch's own error.
	 */
	readonly reason: string;

	constructor(cause: unknown) {
		super('The CMS could not be read for the partners document, and no copy is kept', { cause });
		this.name = 'CmsUnavailableError';
		this.reason = cause instanceof Error ? cause.message : String(cause);
	}
}

/** How many failed fields a shape-check failure names before it says how many more there are. */
const FIELDS_NAMED = 5;

/**
 * The CMS's answer failed the shape check. Names the fields that failed and why, never their
 * values: the body holds member perks, which must not reach the log.
 */
function notAPartnersDocument(error: z.ZodError) {
	const fields = error.issues.map(
		(issue) => `${issue.path.length ? issue.path.join('.') : '(the document)'}: ${issue.message}`
	);
	const more = fields.length > FIELDS_NAMED ? `; and ${fields.length - FIELDS_NAMED} more` : '';
	return new Error(
		`The CMS answered with something that isn't a partners document: ${fields.slice(0, FIELDS_NAMED).join('; ')}${more}`
	);
}

/** The CMS's failure as one error whose message says what went wrong. */
function explain(err: unknown, timeoutMs: number) {
	if (err instanceof z.ZodError) return notAPartnersDocument(err);
	if (err instanceof Error && err.name === 'TimeoutError') {
		return new Error(`The CMS did not answer within ${timeoutMs} ms`, { cause: err });
	}
	return err;
}

/** Where the CMS serves the partners document. */
export const PARTNERS_PATH = '/api/community/partners';

/** How long a copy is served without asking the CMS: published edits show within this. */
export const FRESH_MS = 5 * 60_000;
/** How long the last good copy is served while the CMS is failing. */
export const KEEP_MS = 7 * 24 * 60 * 60_000;
/** How long one request to the CMS may take before the kept copy is served instead. */
export const CMS_TIMEOUT_MS = 5_000;

export type CmsOptions = {
	/** The CMS's origin, e.g. `https://cms.flyindycenter.com`. */
	baseUrl: string;
	/** `COMMUNITY_API_TOKEN`, sent as a bearer token. */
	token: string | undefined;
	fetch: typeof fetch;
	store: CopyStore;
	now?: () => number;
	timeoutMs?: number;
};

export function createCms(options: CmsOptions): Cms {
	const { baseUrl, token, store } = options;
	const now = options.now ?? Date.now;
	const timeoutMs = options.timeoutMs ?? CMS_TIMEOUT_MS;

	/**
	 * The kept copy, checked as a fetched body is, or undefined when there is none or it fails the
	 * check (one kept by an earlier version of the site, say).
	 */
	async function keptCopy() {
		const kept = await store.get().catch((err) => {
			logger.error('Reading the kept copy of the partners document failed', err);
			return undefined;
		});
		if (!kept) return undefined;
		try {
			return { fetchedAt: kept.fetchedAt, body: partnersDocument.parse(kept.body) };
		} catch (err) {
			logger.warn('The kept copy is not a partners document; ignoring it', err);
			return undefined;
		}
	}

	return {
		async partners() {
			const kept = await keptCopy();
			const age = kept ? now() - kept.fetchedAt : Infinity;
			if (kept && age < FRESH_MS) return kept.body;

			try {
				const response = await options.fetch(new URL(PARTNERS_PATH, baseUrl), {
					headers: { Accept: 'application/json', Authorization: `Bearer ${token ?? ''}` },
					signal: AbortSignal.timeout(timeoutMs)
				});
				if (!response.ok) throw new Error(`The CMS answered ${response.status}`);
				const body = partnersDocument.parse(await response.json());

				await store.put({ fetchedAt: now(), body }).catch((err) => {
					logger.error('Keeping a copy of the partners document failed', err);
				});
				return body;
			} catch (caught) {
				const err = explain(caught, timeoutMs);
				if (kept && age < KEEP_MS) {
					logger.warn(
						'Reading the partners document from the CMS failed; serving the kept copy',
						err
					);
					return kept.body;
				}
				throw new CmsUnavailableError(err);
			}
		}
	};
}

/** The copy kept in memory: for tests, and for `vite dev`, whose Cache API keeps nothing. */
export function memoryStore(): CopyStore {
	let kept: KeptCopy | undefined;
	return {
		async get() {
			return kept;
		},
		async put(copy) {
			kept = copy;
		}
	};
}

/**
 * Where the copy is filed in the Cache API. The host is invented on purpose: no request from
 * outside can ever be for it, so the copy (member perks included) can never be served to a browser
 * from Cloudflare's cache.
 */
const CACHE_KEY = 'https://community-website-copies.internal' + PARTNERS_PATH;

/**
 * The copy kept in the Workers Cache API, so every isolate in a data centre shares it. The entry
 * lives for `KEEP_MS`; whether it is fresh is decided from its own `fetchedAt`, not by the cache,
 * which is what lets a stale copy be served when the CMS fails.
 */
export function cacheApiStore(cache: Cache): CopyStore {
	return {
		async get() {
			const response = await cache.match(CACHE_KEY);
			return response ? ((await response.json()) as KeptCopy) : undefined;
		},
		async put(copy) {
			await cache.put(
				CACHE_KEY,
				new Response(JSON.stringify(copy), {
					headers: {
						'Content-Type': 'application/json',
						'Cache-Control': `max-age=${KEEP_MS / 1000}`
					}
				})
			);
		}
	};
}

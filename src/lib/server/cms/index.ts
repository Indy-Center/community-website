import { logger } from '$lib/server/logger';
import { partnersDocument } from './schema';
import type { PartnersDocument } from './types';

/**
 * Everything the site reads from the CMS, and the only place that talks to it. Follows
 * indy-library's client (`src/lib/server/cms/index.ts` there); copy changes across by hand.
 *
 * The document is kept for a few minutes (`FRESH_MS`) so pages are quick and the CMS is not asked
 * on every request. When the CMS cannot be reached, answers with an error, takes too long, or answers
 * with something that is not the document asked for, the last good copy is served instead for as
 * long as `KEEP_MS`, so a CMS outage does not take the partners page down. Only a document of the
 * right shape is ever kept. Only with no copy at all does a read fail, with `CmsUnavailableError`.
 *
 * The document includes member perks. It is kept server-side only; pages read it through
 * `readPartners` (`$lib/server/partners`), which decides what each visitor is sent.
 */
export type Cms = {
	/** Every published partner, grouped by partner category, in order. */
	partners(): Promise<PartnersDocument>;
};

/** A document as it was fetched, and when. */
export type KeptCopy = { fetchedAt: number; body: unknown };

/** Where copies are kept. The Workers Cache API in production, a Map in tests and `vite dev`. */
export type CopyStore = {
	get(key: string): Promise<KeptCopy | undefined>;
	put(key: string, copy: KeptCopy): Promise<void>;
};

export class CmsUnavailableError extends Error {
	constructor(path: string, cause: unknown) {
		super(`The CMS could not be read for ${path}, and no copy is kept`, { cause });
		this.name = 'CmsUnavailableError';
	}
}

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

	/** Reads `path`, keeping the body only once `parse` accepts it; `parse` throws on anything else. */
	async function read<T>(path: string, parse: (body: unknown) => T): Promise<T> {
		const kept = await store.get(path).catch((err) => {
			logger.error(`Reading the kept copy of ${path} failed`, err);
			return undefined;
		});
		const age = kept ? now() - kept.fetchedAt : Infinity;
		if (kept && age < FRESH_MS) return kept.body as T;

		try {
			const response = await options.fetch(new URL(path, baseUrl), {
				headers: { Accept: 'application/json', Authorization: `Bearer ${token ?? ''}` },
				signal: AbortSignal.timeout(timeoutMs)
			});
			if (!response.ok) throw new Error(`The CMS answered ${response.status}`);
			const body = parse(await response.json());

			await store.put(path, { fetchedAt: now(), body }).catch((err) => {
				logger.error(`Keeping a copy of ${path} failed`, err);
			});
			return body;
		} catch (err) {
			if (kept && age < KEEP_MS) {
				logger.warn(`CMS read failed for ${path}; serving the kept copy`, err);
				return kept.body as T;
			}
			throw new CmsUnavailableError(path, err);
		}
	}

	return {
		async partners() {
			return read('/api/community/partners', (body) => partnersDocument.parse(body));
		}
	};
}

/** Copies kept in memory: for tests, and for `vite dev`, whose Cache API keeps nothing. */
export function memoryStore(): CopyStore {
	const copies = new Map<string, KeptCopy>();
	return {
		async get(key) {
			return copies.get(key);
		},
		async put(key, copy) {
			copies.set(key, copy);
		}
	};
}

/**
 * The host the kept copies are filed under in the Cache API. Invented on purpose: no request from
 * outside can ever be for this host, so nothing kept here (member perks included) can be served to
 * a browser from Cloudflare's cache.
 */
const CACHE_HOST = 'https://community-website-copies.internal';

/**
 * Copies kept in the Workers Cache API, so every isolate in a data centre shares them. The entry
 * lives for `KEEP_MS`; whether it is fresh is decided from its own `fetchedAt`, not by the cache,
 * which is what lets a stale copy be served when the CMS fails.
 */
export function cacheApiStore(cache: Cache): CopyStore {
	return {
		async get(key) {
			const response = await cache.match(CACHE_HOST + key);
			return response ? ((await response.json()) as KeptCopy) : undefined;
		},
		async put(key, copy) {
			await cache.put(
				CACHE_HOST + key,
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

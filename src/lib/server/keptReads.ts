import { logger } from '$lib/server/logger';

/**
 * Reads from another system, kept for a while so pages don't ask it on every request, and served
 * stale while it is failing. Used for the booking system's lists and the CMS positions catalogue.
 */

/** A read as it was fetched, and when. */
export type KeptRead = { fetchedAt: number; body: unknown };

/** Where reads are kept. The Workers Cache API on Cloudflare, memory in tests and `vite dev`. */
export type ReadStore = {
	get(key: string): Promise<KeptRead | undefined>;
	put(key: string, read: KeptRead): Promise<void>;
	delete(key: string): Promise<void>;
};

/** The longest any read is kept; each read decides from `fetchedAt` how long it will use one. */
export const LONGEST_KEEP_MS = 7 * 24 * 60 * 60_000;

/**
 * A kept read while it is younger than `freshMs`; else a new one, or the kept one while `load` is
 * failing and it is younger than `keepMs`. `parse` checks every body before it is used or kept.
 */
export async function readKept<T>(opts: {
	store: ReadStore;
	key: string;
	now: () => number;
	freshMs: number;
	keepMs: number;
	load: () => Promise<unknown>;
	parse: (body: unknown) => T;
}): Promise<T> {
	const { store, key, now } = opts;
	const copy = await store.get(key).catch(() => undefined);
	const age = copy ? now() - copy.fetchedAt : Infinity;
	if (copy && age < opts.freshMs) return opts.parse(copy.body);

	try {
		const body = await opts.load();
		const parsed = opts.parse(body);
		await store.put(key, { fetchedAt: now(), body }).catch((error) => {
			logger.error(`Keeping a copy of ${key} failed`, error);
		});
		return parsed;
	} catch (error) {
		if (copy && age < opts.keepMs) {
			logger.warn(`Reading ${key} failed; serving the kept copy`, error);
			return opts.parse(copy.body);
		}
		throw error;
	}
}

/** Reads kept in memory: for tests, and for `vite dev`, whose Cache API keeps nothing. */
export function memoryReadStore(): ReadStore {
	const reads = new Map<string, KeptRead>();
	return {
		async get(key) {
			return reads.get(key);
		},
		async put(key, read) {
			reads.set(key, read);
		},
		async delete(key) {
			reads.delete(key);
		}
	};
}

/**
 * Reads kept in the Workers Cache API, so every isolate in a data centre shares them. The host is
 * invented, so no request from outside can ever be served one. Whether a read is fresh is decided
 * from its own `fetchedAt`, which is what lets a stale one be served while the source is failing.
 */
export function cacheApiReadStore(cache: Cache): ReadStore {
	const keyFor = (key: string) => `https://community-website-reads.internal${key}`;
	return {
		async get(key) {
			const response = await cache.match(keyFor(key));
			return response ? ((await response.json()) as KeptRead) : undefined;
		},
		async put(key, read) {
			await cache.put(
				keyFor(key),
				new Response(JSON.stringify(read), {
					headers: {
						'Content-Type': 'application/json',
						'Cache-Control': `max-age=${LONGEST_KEEP_MS / 1000}`
					}
				})
			);
		},
		async delete(key) {
			await cache.delete(keyFor(key));
		}
	};
}

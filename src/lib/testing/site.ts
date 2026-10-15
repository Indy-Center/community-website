import { createCms, memoryStore } from '$lib/server/cms';
import { partners } from './fixtures';

export const CMS_URL = 'https://cms.example.test';
export const TOKEN = 'test-token';

/** How long tests let the CMS take before treating it as down. */
export const TEST_CMS_TIMEOUT_MS = 20;

/** The CMS's documents by path, as the fake CMS serves them. */
export function cmsDocuments(): Record<string, unknown> {
	return { '/api/partners': partners };
}

/**
 * A stand-in for the CMS's HTTP API: serves `documents` by path, 404s anything else, and records
 * every request. `down()` makes every request fail, as an outage would; `hang()` makes every
 * request wait until it is given up on, as a CMS too slow to answer would.
 */
export function fakeCms(documents = cmsDocuments()) {
	const requests: string[] = [];
	const authorizations: (string | null)[] = [];
	let state: 'up' | 'down' | 'hanging' = 'up';

	const fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
		const url = new URL(String(input));
		requests.push(url.pathname);
		authorizations.push(new Headers(init?.headers).get('Authorization'));
		if (state === 'down') throw new TypeError('fetch failed');
		if (state === 'hanging') {
			return new Promise<Response>((_, reject) => {
				init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
			});
		}
		if (!(url.pathname in documents)) return new Response('Not found', { status: 404 });
		return Response.json(documents[url.pathname]);
	}) as typeof globalThis.fetch;

	return {
		fetch,
		documents,
		requests,
		authorizations,
		down() {
			state = 'down';
		},
		hang() {
			state = 'hanging';
		},
		/** How many times `path` was asked for. */
		asked(path: string) {
			return requests.filter((r) => r === path).length;
		}
	};
}

/**
 * One running site: a fake CMS, the kept copies (shared across requests, as the Cache API is), and
 * a clock tests can move. `event()` builds what one request's page load receives.
 */
export function site(opts: { cms?: ReturnType<typeof fakeCms> } = {}) {
	const cms = opts.cms ?? fakeCms();
	const store = memoryStore();
	const clock = { now: Date.parse('2026-10-14T12:00:00Z') };

	return {
		cms,
		clock,
		event(href: string, params: Record<string, string> = {}) {
			return {
				url: new URL(href, 'https://flyindycenter.com'),
				params,
				locals: {
					roles: [],
					cms: createCms({
						baseUrl: CMS_URL,
						token: TOKEN,
						fetch: cms.fetch,
						store,
						now: () => clock.now,
						timeoutMs: TEST_CMS_TIMEOUT_MS
					})
				}
			};
		}
	};
}

/** Calls a page's server load with a hand-built event. */
export function run<L extends (event: never) => unknown>(load: L, event: unknown): ReturnType<L> {
	return load(event as Parameters<L>[0]) as ReturnType<L>;
}

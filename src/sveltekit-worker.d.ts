// The SvelteKit worker that the adapter writes into .svelte-kit/cloudflare, which
// src/worker.ts serves. It exists only after `vite build`, so the type check, which
// runs before a build, needs its type from here.
declare module '*/.svelte-kit/cloudflare/_worker.js' {
	const worker: { fetch: ExportedHandlerFetchHandler<Cloudflare.Env> };
	export default worker;
}

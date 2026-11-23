// Config for running scripts outside the Worker with vite-node. It resolves `$lib` and gives
// `$env/dynamic/private` the process environment, so a script reaches the same shared server code
// (such as `clientToken()`) the site does.
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
	resolve: {
		alias: [
			{ find: '$env/dynamic/private', replacement: here('./env-shim.ts') },
			{ find: '$lib', replacement: here('../src/lib') }
		]
	}
});

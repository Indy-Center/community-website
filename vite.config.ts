import { sentrySvelteKit } from '@sentry/sveltekit';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import Icons from 'unplugin-icons/vite';

export default defineConfig({
	plugins: [
		sentrySvelteKit({
			org: 'indy-center',
			project: 'community-website',
			authToken: process.env.SENTRY_AUTH_TOKEN,
			autoUploadSourceMaps: true,
			sourceMapsUploadOptions: {
				include: ['.svelte-kit/output/client/', '.svelte-kit/output/server/'],
				cleanArtifacts: true,
				deleteFilesAfterUpload: false
			}
		}),
		tailwindcss(),
		sveltekit(),
		Icons({
			compiler: 'svelte'
		})
	],
	build: {
		sourcemap: true
	}
});

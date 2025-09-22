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
			autoUploadSourceMaps: true
		}),
		tailwindcss(),
		sveltekit(),
		Icons({
			compiler: 'svelte'
		})
	]
});

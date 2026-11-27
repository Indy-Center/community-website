<script lang="ts">
	import { page } from '$app/state';
	import { ErrorPage } from '@indy-center/centerline-svelte';
	import { mdiAccountGroup, mdiCalendar, mdiMessage } from '@mdi/js';

	const notFound = $derived(page.status === 404);
	/** What a load said was missing, e.g. "Partner not found"; SvelteKit's own 404 says "Not Found". */
	const missing = $derived(
		notFound && page.error?.message && page.error.message !== 'Not Found'
			? page.error.message
			: null
	);
</script>

<svelte:head>
	<title>{notFound ? (missing ?? 'Page not found') : 'Error'} | Indy Center</title>
</svelte:head>

<ErrorPage
	status={page.status}
	message={page.error?.message}
	path={page.url.pathname}
	links={[
		{ label: 'Events', href: '/events', icon: mdiCalendar },
		{ label: 'Roster', href: '/roster', icon: mdiAccountGroup },
		{ label: 'Feedback', href: '/feedback', icon: mdiMessage }
	]}
/>

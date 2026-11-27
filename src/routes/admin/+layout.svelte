<script lang="ts">
	import { page } from '$app/state';
	import { Tabs } from '@indy-center/centerline-svelte';
	import { isAdmin } from '$lib/utils/permissions';

	let { children, data } = $props();

	const allTabs = [
		{ label: 'Dashboard', href: '/admin' },
		{ label: 'Users', href: '/admin/users' },
		{ label: 'Feedback', href: '/admin/feedback' }
	];

	// Feedback reviewers who aren't admins only see the feedback section
	const tabs = $derived(
		isAdmin(data.roles) ? allTabs : allTabs.filter((tab) => tab.href === '/admin/feedback')
	);

	// The section the page is in: the longest tab address it starts with
	const current = $derived(
		[...tabs]
			.sort((a, b) => b.href.length - a.href.length)
			.find((tab) => page.url.pathname === tab.href || page.url.pathname.startsWith(tab.href + '/'))
			?.href
	);
</script>

{#if tabs.length > 1}
	<Tabs label="Admin" items={tabs} {current} class="mb-6" />
{/if}

{@render children()}

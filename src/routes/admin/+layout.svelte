<script lang="ts">
	import { page } from '$app/state';
	import IconAccountGroup from '~icons/mdi/account-group';
	import IconMessage from '~icons/mdi/message';
	import { isAdmin } from '$lib/utils/permissions';

	let { children, data } = $props();

	const allLinks = [
		{
			label: 'Manage Users',
			href: '/admin/users',
			icon: IconAccountGroup,
			description: 'Manage user accounts, roles, and permissions'
		},
		{
			label: 'Manage Feedback',
			href: '/admin/feedback',
			icon: IconMessage,
			description: 'Review and manage controller feedback'
		}
	];

	// Feedback reviewers who aren't admins only see the feedback section
	const adminLinks = $derived(
		isAdmin(data.roles) ? allLinks : allLinks.filter((link) => link.href === '/admin/feedback')
	);

	function isActive(href: string) {
		return page.url.pathname === href || page.url.pathname.startsWith(href + '/');
	}
</script>

<div class="space-y-6">
	<!-- Sub Navigation -->
	<div class="border-b border-slate-700/50">
		<nav class="-mb-px flex space-x-8">
			{#each adminLinks as link}
				{@const Icon = link.icon}
				<a
					href={link.href}
					class="group flex items-center space-x-2 border-b-2 px-1 py-4 text-sm font-medium transition-all duration-200 {isActive(
						link.href
					)
						? 'border-sky-400 text-sky-400'
						: 'border-transparent text-gray-400 hover:border-gray-300 hover:text-gray-300'}"
				>
					<Icon class="h-4 w-4" />
					<span>{link.label}</span>
				</a>
			{/each}
		</nav>
	</div>

	<!-- Main Content -->
	<div>
		{@render children()}
	</div>
</div>

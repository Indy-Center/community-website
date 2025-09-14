<script lang="ts">
	import IconAccountGroup from '~icons/mdi/account-group';
	import IconArrowRight from '~icons/mdi/arrow-right';

	let { data } = $props();

	const adminSections = [
		{
			title: 'User Management',
			description: 'Manage user accounts, roles, and permissions. View user activity and control access.',
			href: '/admin/users',
			icon: IconAccountGroup,
			stats: 'All registered users'
		}
	];
</script>

<svelte:head>
	<title>Admin Dashboard - Indy Center</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h2 class="text-2xl font-semibold text-white mb-2">Admin Dashboard</h2>
		<p class="text-gray-400">Welcome back! Choose a section below to get started.</p>
	</div>

	<div class="grid grid-cols-1 gap-6">
		{#each adminSections as section}
			{@const Icon = section.icon}
			<a
				href={section.href}
				class="group relative overflow-hidden rounded-xl border border-slate-700/50 bg-slate-800/50 p-6 transition-all duration-200 hover:border-slate-600/50 hover:bg-slate-700/50 hover:shadow-lg"
			>
				<div class="flex items-start justify-between">
					<div class="flex items-start space-x-4">
						<div class="rounded-lg bg-sky-600/20 p-3 group-hover:bg-sky-500/20 transition-colors duration-200">
							<Icon class="h-8 w-8 text-sky-400 group-hover:text-sky-300" />
						</div>
						<div class="flex-1">
							<h3 class="text-lg font-semibold text-white group-hover:text-sky-100 mb-2 transition-colors duration-200">
								{section.title}
							</h3>
							<p class="text-gray-400 group-hover:text-gray-300 mb-3 text-sm leading-relaxed transition-colors duration-200">
								{section.description}
							</p>
							<div class="inline-flex items-center space-x-1 text-xs text-sky-400 group-hover:text-sky-300 transition-colors duration-200">
								<span>{section.stats}</span>
							</div>
						</div>
					</div>
					<IconArrowRight class="h-5 w-5 text-gray-500 group-hover:text-sky-400 group-hover:translate-x-1 transition-all duration-200" />
				</div>
			</a>
		{/each}
	</div>

	<!-- Quick Stats -->
	<div class="mt-8 rounded-xl border border-slate-700/50 bg-slate-800/30 p-6">
		<h3 class="text-lg font-semibold text-white mb-4">System Overview</h3>
		<div class="text-sm text-gray-400">
			<p>Logged in as: <span class="text-white font-medium">{data.user?.firstName} {data.user?.lastName}</span></p>
			<p class="mt-1">Admin privileges: <span class="text-sky-400">Full Access</span></p>
		</div>
	</div>
</div>
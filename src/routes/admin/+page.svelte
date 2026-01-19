<script lang="ts">
	import IconAccountGroup from '~icons/mdi/account-group';
	import IconCalendar from '~icons/mdi/calendar';
	import IconMessage from '~icons/mdi/message';
	import IconArrowRight from '~icons/mdi/arrow-right';
	import IconAccount from '~icons/mdi/account';
	import IconShield from '~icons/mdi/shield';
	import IconChartLine from '~icons/mdi/chart-line';

	let { data } = $props();

	const { stats } = data;

	const adminSections = [
		{
			title: 'User Management',
			description: 'Manage user accounts, roles, certifications, and endorsements.',
			href: '/admin/users',
			icon: IconAccountGroup,
			badge: stats.users.total,
			color: 'sky'
		},
		{
			title: 'Feedback Management',
			description: 'Review and moderate controller feedback submissions.',
			href: '/admin/feedback',
			icon: IconMessage,
			badge: stats.feedback.pending > 0 
				? `${stats.feedback.pending} pending` 
				: `${stats.feedback.total} total`,
			color: 'purple'
		}
	];

	function getColorClasses(color: string) {
		const colors = {
			sky: 'bg-sky-600/20 text-sky-400 group-hover:bg-sky-500/20 group-hover:text-sky-300',
			purple: 'bg-purple-600/20 text-purple-400 group-hover:bg-purple-500/20 group-hover:text-purple-300'
		};
		return colors[color as keyof typeof colors] || colors.sky;
	}
</script>

<svelte:head>
	<title>Admin Dashboard - Indy Center</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h2 class="text-2xl font-semibold text-white mb-2">Admin Dashboard</h2>
		<p class="text-gray-400">Welcome back, {data.user?.preferredName || data.user?.firstName}! Here's an overview of your system.</p>
	</div>

	<!-- Stats Grid -->
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<!-- Users Stat -->
		<div class="rounded-lg border border-slate-700/50 bg-slate-800/50 p-4">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm text-gray-400">Total Users</p>
					<p class="text-2xl font-semibold text-white mt-1">{stats.users.total}</p>
					<p class="text-xs text-slate-500 mt-1">{stats.users.controllers} controllers</p>
				</div>
				<div class="rounded-lg bg-sky-600/20 p-3">
					<IconAccount class="h-6 w-6 text-sky-400" />
				</div>
			</div>
		</div>

		<!-- Events Stat -->
		<div class="rounded-lg border border-slate-700/50 bg-slate-800/50 p-4">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm text-gray-400">Events</p>
					<p class="text-2xl font-semibold text-white mt-1">{stats.events.total}</p>
					<p class="text-xs text-slate-500 mt-1">{stats.events.published} published</p>
				</div>
				<div class="rounded-lg bg-purple-600/20 p-3">
					<IconCalendar class="h-6 w-6 text-purple-400" />
				</div>
			</div>
		</div>

		<!-- Positions Stat -->
		<div class="rounded-lg border border-slate-700/50 bg-slate-800/50 p-4">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm text-gray-400">Event Positions</p>
					<p class="text-2xl font-semibold text-white mt-1">{stats.positions.total}</p>
					<p class="text-xs text-slate-500 mt-1">{stats.positions.assigned} assigned</p>
				</div>
				<div class="rounded-lg bg-cyan-600/20 p-3">
					<IconChartLine class="h-6 w-6 text-cyan-400" />
				</div>
			</div>
		</div>

		<!-- Feedback Stat -->
		<div class="rounded-lg border border-slate-700/50 bg-slate-800/50 p-4">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm text-gray-400">Feedback</p>
					<p class="text-2xl font-semibold text-white mt-1">{stats.feedback.total}</p>
					<p class="text-xs {stats.feedback.pending > 0 ? 'text-yellow-400' : 'text-slate-500'} mt-1">
						{stats.feedback.pending} pending
					</p>
				</div>
				<div class="rounded-lg bg-amber-600/20 p-3">
					<IconMessage class="h-6 w-6 text-amber-400" />
				</div>
			</div>
		</div>
	</div>

	<!-- Admin Sections -->
	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
		{#each adminSections as section}
			{@const Icon = section.icon}
			<a
				href={section.href}
				class="group relative overflow-hidden rounded-xl border border-slate-700/50 bg-slate-800/50 p-6 transition-all duration-200 hover:border-slate-600/50 hover:bg-slate-700/50 hover:shadow-lg"
			>
				<div class="flex items-start justify-between">
					<div class="flex items-start space-x-4 flex-1">
						<div class="rounded-lg p-3 transition-colors duration-200 {getColorClasses(section.color)}">
							<Icon class="h-8 w-8" />
						</div>
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-2 mb-2">
								<h3 class="text-lg font-semibold text-white group-hover:text-sky-100 transition-colors duration-200">
									{section.title}
								</h3>
								{#if section.badge}
									<span
										class="rounded-full px-2 py-0.5 text-xs font-medium {typeof section.badge === 'string' && section.badge.includes('pending') 
											? 'bg-yellow-600/20 text-yellow-300' 
											: 'bg-sky-600/20 text-sky-300'}"
									>
										{section.badge}
									</span>
								{/if}
							</div>
							<p class="text-gray-400 group-hover:text-gray-300 text-sm leading-relaxed transition-colors duration-200">
								{section.description}
							</p>
						</div>
					</div>
					<IconArrowRight class="h-5 w-5 text-gray-500 group-hover:text-sky-400 group-hover:translate-x-1 transition-all duration-200 flex-shrink-0 ml-4" />
				</div>
			</a>
		{/each}
	</div>

	<!-- User Info -->
	<div class="rounded-xl border border-slate-700/50 bg-slate-800/30 p-6">
		<div class="flex items-center gap-4">
			<div class="rounded-lg bg-slate-700/50 p-3">
				<IconShield class="h-6 w-6 text-sky-400" />
			</div>
			<div>
				<h3 class="text-sm font-semibold text-white">Admin Access</h3>
				<p class="text-sm text-gray-400 mt-1">
					Logged in as <span class="text-white font-medium">{data.user?.preferredName || data.user?.firstName} {data.user?.lastName}</span>
				</p>
			</div>
		</div>
	</div>
</div>
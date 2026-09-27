<script lang="ts">
	import { page } from '$app/state';
	import IconRadar from '~icons/mdi/radar';
	import IconAlert from '~icons/mdi/alert-circle-outline';
	import IconHome from '~icons/mdi/home';
	import IconArrowLeft from '~icons/mdi/arrow-left';
	import IconCalendar from '~icons/mdi/calendar';
	import IconAccountGroup from '~icons/mdi/account-group';
	import IconMessage from '~icons/mdi/message';

	const notFound = $derived(page.status === 404);

	const HELPFUL_LINKS = [
		{ label: 'Events', href: '/events', icon: IconCalendar },
		{ label: 'Roster', href: '/roster', icon: IconAccountGroup },
		{ label: 'Feedback', href: '/feedback', icon: IconMessage }
	];
</script>

<svelte:head>
	<title>Indy Center | {notFound ? 'Page Not Found' : 'Error'}</title>
</svelte:head>

<div class="flex flex-1 flex-col items-center justify-center py-16 text-center">
	<div
		class="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-sky-500/30 bg-sky-600/20"
	>
		{#if notFound}
			<IconRadar class="h-10 w-10 text-sky-300" />
		{:else}
			<IconAlert class="h-10 w-10 text-sky-300" />
		{/if}
	</div>

	<p
		class="bg-gradient-to-b from-white to-slate-500 bg-clip-text font-mono text-7xl font-bold text-transparent md:text-8xl"
	>
		{page.status}
	</p>

	<h1 class="mt-4 text-2xl font-bold text-white md:text-3xl">
		{notFound ? 'Radar contact lost' : 'Something went wrong'}
	</h1>

	<p class="mt-3 max-w-md leading-relaxed text-slate-400">
		{#if notFound}
			We couldn't find the page you were looking for. It may have moved, or the link might be wrong.
		{:else}
			{page.error?.message ?? 'An unexpected error occurred.'} Please try again in a moment.
		{/if}
	</p>

	{#if notFound}
		<p
			class="mt-4 max-w-full truncate rounded-md bg-slate-800/60 px-3 py-1 font-mono text-sm text-slate-400"
		>
			{page.url.pathname}
		</p>
	{/if}

	<div class="mt-8 flex flex-wrap justify-center gap-3">
		<a
			href="/"
			class="flex items-center space-x-2 rounded-lg border border-sky-500/30 bg-sky-600/40 px-5 py-2.5 text-sm font-medium text-white transition-colors duration-200 hover:border-sky-400/50 hover:bg-sky-500/50"
		>
			<IconHome class="h-4 w-4" />
			<span>Return Home</span>
		</a>
		<button
			type="button"
			onclick={() => history.back()}
			class="flex cursor-pointer items-center space-x-2 rounded-lg border border-slate-500/30 px-5 py-2.5 text-sm font-medium text-gray-300 transition-colors duration-200 hover:border-slate-400/50 hover:bg-slate-600/20 hover:text-white"
		>
			<IconArrowLeft class="h-4 w-4" />
			<span>Go Back</span>
		</button>
	</div>

	{#if notFound}
		<div class="mt-10 border-t border-slate-700/60 pt-6">
			<p class="mb-3 text-xs font-medium tracking-wider text-slate-500 uppercase">
				Or try one of these
			</p>
			<div class="flex flex-wrap justify-center gap-2">
				{#each HELPFUL_LINKS as link}
					{@const Icon = link.icon}
					<a
						href={link.href}
						class="flex items-center space-x-2 rounded-lg px-3 py-2 text-sm text-gray-400 transition-colors duration-200 hover:bg-white/10 hover:text-white"
					>
						<Icon class="h-4 w-4" />
						<span>{link.label}</span>
					</a>
				{/each}
			</div>
		</div>
	{/if}
</div>

<script lang="ts">
	import { page } from '$app/state';
	import Logo from './Logo.svelte';
	import IconHome from '~icons/mdi/home';
	import IconAccountGroup from '~icons/mdi/account-group';
	import IconCog from '~icons/mdi/cog';
	import IconCalendar from '~icons/mdi/calendar';
	import IconRating from '~icons/mdi/radar';
	import IconLogout from '~icons/mdi/logout';
	import IconAccount from '~icons/mdi/account-circle';
	import IconChevronDown from '~icons/mdi/chevron-down';
	import IconMenu from '~icons/mdi/menu';
	import IconClose from '~icons/mdi/close';
	import type { User } from '$lib/db/schema/users';

	let { data }: { data: { user: User | undefined; roles: string[] | undefined } } = $props();

	function getFullName(user: User): string {
		return user.preferredName
			? `${user.preferredName} ${user.lastName}`
			: `${user.firstName} ${user.lastName}`;
	}

	let showDropdown = $state(false);
	let showMobileMenu = $state(false);

	const BASE_LINKS = [
		{
			label: 'Home',
			href: '/',
			icon: IconHome
		},
		{
			label: 'Events',
			href: '/events',
			icon: IconCalendar
		},
		{
			label: 'Roster',
			href: '/roster',
			icon: IconAccountGroup
		}
	];

	const links = $derived([
		...BASE_LINKS,
		...(data.user && data.roles?.includes('admin')
			? [
					{
						label: 'Admin',
						href: '/admin',
						icon: IconCog
					}
				]
			: [])
	]);

	function isActive(href: string) {
		return page.url.pathname === href || page.url.pathname.startsWith(href + '/');
	}

	function toggle(event: Event) {
		event.stopPropagation();
		showDropdown = !showDropdown;
	}

	function toggleMobile() {
		showMobileMenu = !showMobileMenu;
	}
</script>

<svelte:document
	onclick={(e: Event) => {
		const target = e.target as HTMLElement;
		if (!target.closest('.user-dropdown') && !target.closest('.mobile-menu-container')) {
			showDropdown = false;
			showMobileMenu = false;
		}
	}}
/>

<!-- Navigation Header -->
<div class="relative z-20 mx-auto flex h-16 w-full max-w-7xl items-center justify-between p-2">
	<!-- Logo + User Info -->
	<div class="flex items-center space-x-4">
		<a href="/" class="cursor-pointer">
			<Logo class="h-8 w-auto" />
		</a>
		<div class="hidden md:block">
			{#if data.user}
				<div class="relative">
					<button
						type="button"
						onclick={toggle}
						aria-expanded={showDropdown}
						aria-haspopup="menu"
						aria-label="User menu"
						class="flex cursor-pointer items-center space-x-3 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ease-in-out {showDropdown
							? 'rounded-t-lg rounded-b-none border border-b-0 border-slate-600/30 bg-sky-600/20 text-white'
							: 'rounded-lg text-gray-300 hover:scale-105 hover:bg-white/10 hover:text-white'}"
					>
						<IconAccount class="h-6 w-6 text-sky-400" />
						<div class="flex items-center space-x-2">
							<span class="font-medium">{getFullName(data.user)}</span>
							<div class="flex items-center space-x-1">
								{#if data.user.data.vatsim.rating.short}
									<div
										class="flex items-center gap-1 rounded-md bg-sky-600/30 px-2 py-1 font-mono text-xs text-sky-200"
									>
										<IconRating class="h-3 w-3" />
										{data.user.data.vatsim.rating.short}
									</div>
								{/if}
								{#if data.user.data.vatsim.pilotrating.short}
									<div
										class="flex items-center gap-1 rounded-md bg-pink-600/30 px-2 py-1 font-mono text-xs text-pink-200"
									>
										<IconRating class="h-3 w-3" />
										{data.user.data.vatsim.pilotrating.short}
									</div>
								{/if}
							</div>
						</div>
						<IconChevronDown
							class="h-4 w-4 transition-transform duration-200 {showDropdown ? 'rotate-180' : ''}"
						/>
					</button>

					{#if showDropdown}
						<div
							role="menu"
							class="absolute top-full right-0 left-0 z-[9999] rounded-t-none rounded-b-lg border border-t-0 border-slate-600/30 bg-slate-800/95 shadow-xl backdrop-blur-lg"
							onclick={(e) => e.stopPropagation()}
							onkeydown={(e) => e.stopPropagation()}
							tabindex="-1"
						>
							<div class="p-3">
								<a
									href="/logout"
									role="menuitem"
									class="flex w-full cursor-pointer items-center space-x-2 rounded-lg px-3 py-2 text-sm text-red-300 transition-colors duration-200 hover:bg-red-600/20 hover:text-red-200"
								>
									<IconLogout class="h-4 w-4" />
									<span>Sign Out</span>
								</a>
							</div>
						</div>
					{/if}
				</div>
			{:else}
				<!-- Login Button for non-authenticated users -->
				<a
					href="/login/connect"
					class="flex cursor-pointer items-center space-x-1.5 rounded-md bg-sky-400/30 px-3 py-1.5 text-xs font-medium text-white transition-colors duration-200 hover:bg-slate-600/50 hover:text-gray-200"
				>
					<IconAccount class="h-5 w-5" />
					<span>Connect VATSIM Account</span>
				</a>
			{/if}
		</div>
	</div>

	<!-- Desktop Navigation on the right -->
	<nav class="hidden space-x-1 md:flex">
		{#each links as link}
			{@const Icon = link.icon}
			<a
				href={link.href}
				class="relative flex cursor-pointer items-center space-x-2 rounded-lg border-b-2 border-transparent px-4 py-2 text-sm font-medium transition-all duration-200 ease-in-out
				{isActive(link.href)
					? 'border-sky-400 bg-sky-600/20 text-white shadow-lg'
					: 'text-gray-300 hover:scale-105 hover:bg-white/10 hover:text-white'}"
				aria-current={isActive(link.href) ? 'page' : undefined}
			>
				<Icon class="h-4 w-4" aria-hidden="true" />
				<span>{link.label}</span>
			</a>
		{/each}
	</nav>

	<!-- Mobile Menu Button -->
	<button
		type="button"
		onclick={(e) => {
			e.stopPropagation();
			toggleMobile();
		}}
		aria-expanded={showMobileMenu}
		aria-label="Toggle mobile menu"
		class="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-gray-300 transition-colors duration-200 hover:bg-white/10 hover:text-white md:hidden"
	>
		{#if showMobileMenu}
			<IconClose class="h-6 w-6" />
		{:else}
			<IconMenu class="h-6 w-6" />
		{/if}
	</button>
</div>

<!-- Mobile Menu -->
{#if showMobileMenu}
	<div
		class="mobile-menu-container border-t border-slate-600/30 bg-slate-800/95 backdrop-blur-lg md:hidden"
		onclick={(e) => e.stopPropagation()}
		onkeydown={(e) => e.stopPropagation()}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
	>
		<nav aria-label="Mobile navigation">
			<div class="mx-auto max-w-7xl space-y-1 px-2 py-3">
				<!-- Navigation Links -->
				{#each links as link}
					{@const Icon = link.icon}
					<a
						href={link.href}
						class="flex cursor-pointer items-center space-x-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors duration-200 {isActive(
							link.href
						)
							? 'bg-sky-600/20 text-white'
							: 'text-gray-300 hover:bg-white/10 hover:text-white'}"
						onclick={() => (showMobileMenu = false)}
					>
						<Icon class="h-5 w-5" />
						<span>{link.label}</span>
					</a>
				{/each}

				<!-- User Info Section -->
				{#if data.user}
					<div class="mt-3 border-t border-slate-600/30 pt-3">
						<div class="rounded-lg bg-slate-700/30 px-4 py-3">
							<div class="mb-3 flex items-center space-x-3">
								<IconAccount class="h-8 w-8 text-sky-400" />
								<div>
									<div class="text-sm font-semibold text-white">
										{getFullName(data.user)}
									</div>
									<div class="font-mono text-xs text-gray-400">CID: {data.user.cid}</div>
								</div>
							</div>

							<div class="mb-3 flex flex-wrap gap-2">
								{#if data.user.data.vatsim.rating.short}
									<div
										class="flex items-center gap-1 rounded-md bg-sky-600/30 px-2 py-1 font-mono text-xs text-sky-200"
									>
										<IconRating class="h-3 w-3" />
										{data.user.data.vatsim.rating.short}
									</div>
								{/if}
								{#if data.user.data.vatsim.pilotrating.short}
									<div
										class="flex items-center gap-1 rounded-md bg-pink-600/30 px-2 py-1 font-mono text-xs text-pink-200"
									>
										<IconRating class="h-3 w-3" />
										{data.user.data.vatsim.pilotrating.short}
									</div>
								{/if}
							</div>

							<a
								href="/logout"
								class="flex w-full cursor-pointer items-center justify-center space-x-2 rounded-lg border border-red-600/30 px-4 py-2 text-sm text-red-300 transition-colors duration-200 hover:border-red-500/50 hover:bg-red-600/20 hover:text-red-200"
								onclick={() => (showMobileMenu = false)}
							>
								<IconLogout class="h-4 w-4" />
								<span>Sign Out</span>
							</a>
						</div>
					</div>
				{:else}
					<!-- Connect VATSIM Account for non-authenticated users -->
					<div class="mt-3 border-t border-slate-600/30 pt-3">
						<a
							href="/login/connect"
							class="flex w-full cursor-pointer items-center justify-center space-x-2 rounded-lg border border-sky-500/30 bg-sky-600/40 px-4 py-3 text-sm font-medium text-white transition-colors duration-200 hover:border-sky-400/50 hover:bg-sky-500/50"
							onclick={() => (showMobileMenu = false)}
						>
							<IconAccount class="h-5 w-5" />
							<span>Connect VATSIM Account</span>
						</a>
					</div>
				{/if}
			</div>
		</nav>
	</div>
{/if}

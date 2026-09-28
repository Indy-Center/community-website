<script lang="ts">
	import type { Component } from 'svelte';
	import { page } from '$app/state';
	import { afterNavigate } from '$app/navigation';
	import IconHome from '~icons/mdi/home';
	import IconAccountGroup from '~icons/mdi/account-group';
	import IconCalendar from '~icons/mdi/calendar';
	import IconMessage from '~icons/mdi/message';
	import IconHeadset from '~icons/mdi/headset';
	import IconAirplane from '~icons/mdi/airplane';
	import IconInformation from '~icons/mdi/information-outline';
	import IconChevronDown from '~icons/mdi/chevron-down';
	import IconBook from '~icons/mdi/book-open-variant';
	import IconTools from '~icons/mdi/tools';
	import IconMap from '~icons/mdi/map';
	import IconBadge from '~icons/mdi/badge-account-horizontal';
	import IconHandshake from '~icons/mdi/handshake';
	import IconEmail from '~icons/mdi/email-outline';
	import IconAccountPlus from '~icons/mdi/account-plus';

	type NavLink = { label: string; href: string; icon: Component; external?: boolean };
	type NavGroup = { label: string; icon: Component; children: NavLink[] };
	type NavItem = NavLink | NavGroup;

	let { mobile = false }: { mobile?: boolean } = $props();

	const links: NavItem[] = [
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
			label: 'Controlling',
			icon: IconHeadset,
			children: [
				{
					label: 'Tools',
					href: 'https://tools.flyindycenter.com',
					icon: IconTools,
					external: true
				},
				{
					label: 'Library',
					href: 'https://wiki.flyindycenter.com/docs/home',
					icon: IconBook,
					external: true
				},
				{
					label: 'Roster',
					href: '/roster',
					icon: IconAccountGroup
				},
				{
					label: 'Join Indy Center',
					href: '/visit',
					icon: IconAccountPlus
				}
			]
		},
		{
			label: 'Flying',
			icon: IconAirplane,
			children: [
				{
					label: 'Library',
					href: 'https://wiki.flyindycenter.com/pilots',
					icon: IconBook,
					external: true
				},
				{
					label: 'Feedback',
					href: '/feedback',
					icon: IconMessage
				},
				{
					label: 'Charts',
					href: 'https://charts.flyindycenter.com/',
					icon: IconMap,
					external: true
				}
			]
		},
		{
			label: 'About',
			icon: IconInformation,
			children: [
				{
					label: 'Staff',
					href: '/staff',
					icon: IconBadge
				},
				{
					label: 'Partners',
					href: '/partners',
					icon: IconHandshake
				},
				{
					label: 'Contact Us',
					href: '/contact',
					icon: IconEmail
				}
			]
		}
	];

	let openGroup = $state<string | null>(null);

	afterNavigate(() => {
		openGroup = null;
	});

	function isGroup(item: NavItem): item is NavGroup {
		return 'children' in item;
	}

	function isActive(href: string) {
		return page.url.pathname === href || page.url.pathname.startsWith(href + '/');
	}

	function isGroupActive(group: NavGroup) {
		return group.children.some((child) => !child.external && isActive(child.href));
	}

	function toggleGroup(event: Event, label: string) {
		event.stopPropagation();
		openGroup = openGroup === label ? null : label;
	}
</script>

<svelte:document
	onclick={(e: Event) => {
		const target = e.target as HTMLElement;
		if (!target.closest('.nav-dropdown')) {
			openGroup = null;
		}
	}}
	onkeydown={(e: KeyboardEvent) => {
		if (e.key === 'Escape') openGroup = null;
	}}
/>

{#snippet emptyGroup(className: string)}
	<div class="{className} text-sm text-gray-500 italic">Nothing here yet</div>
{/snippet}

{#if mobile}
	{#each links as item}
		{@const Icon = item.icon}
		{#if isGroup(item)}
			<div
				class="mt-2 flex items-center space-x-2 px-4 pt-2 text-xs font-medium tracking-wider text-gray-500 uppercase"
			>
				<Icon class="h-4 w-4" />
				<span>{item.label}</span>
			</div>
			{#each item.children as child}
				{@const ChildIcon = child.icon}
				<a
					href={child.href}
					target={child.external ? '_blank' : undefined}
					rel={child.external ? 'noopener noreferrer' : undefined}
					class="flex cursor-pointer items-center space-x-3 rounded-lg py-3 pr-4 pl-8 text-sm font-medium transition-colors duration-200 {!child.external &&
					isActive(child.href)
						? 'bg-sky-600/20 text-white'
						: 'text-gray-300 hover:bg-white/10 hover:text-white'}"
				>
					<ChildIcon class="h-5 w-5" />
					<span>{child.label}</span>
				</a>
			{:else}
				{@render emptyGroup('py-2 pr-4 pl-8')}
			{/each}
		{:else}
			<a
				href={item.href}
				class="flex cursor-pointer items-center space-x-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors duration-200 {isActive(
					item.href
				)
					? 'bg-sky-600/20 text-white'
					: 'text-gray-300 hover:bg-white/10 hover:text-white'}"
			>
				<Icon class="h-5 w-5" />
				<span>{item.label}</span>
			</a>
		{/if}
	{/each}
{:else}
	<nav class="flex space-x-2">
		{#each links as item}
			{@const Icon = item.icon}
			{#if isGroup(item)}
				{@const open = openGroup === item.label}
				<div class="nav-dropdown relative">
					<button
						type="button"
						onclick={(e) => toggleGroup(e, item.label)}
						aria-expanded={open}
						aria-haspopup="menu"
						class="relative flex cursor-pointer items-center space-x-2 rounded-lg border-b-2 border-transparent px-4 py-2 text-sm font-medium transition-all duration-200 ease-in-out
						{isGroupActive(item)
							? 'border-sky-400 bg-sky-600/20 text-white shadow-lg'
							: open
								? 'bg-white/10 text-white'
								: 'text-gray-300 hover:scale-105 hover:bg-white/10 hover:text-white'}"
					>
						<Icon class="h-4 w-4" aria-hidden="true" />
						<span>{item.label}</span>
						<IconChevronDown
							class="h-4 w-4 transition-transform duration-200 {open ? 'rotate-180' : ''}"
							aria-hidden="true"
						/>
					</button>

					{#if open}
						<div
							role="menu"
							class="absolute top-full left-0 z-[9999] mt-1 min-w-48 rounded-lg border border-slate-600/30 bg-slate-800/95 p-2 shadow-xl backdrop-blur-lg"
						>
							{#each item.children as child}
								{@const ChildIcon = child.icon}
								<a
									href={child.href}
									role="menuitem"
									target={child.external ? '_blank' : undefined}
									rel={child.external ? 'noopener noreferrer' : undefined}
									onclick={() => (openGroup = null)}
									aria-current={!child.external && isActive(child.href) ? 'page' : undefined}
									class="flex w-full cursor-pointer items-center space-x-2 rounded-lg px-3 py-2 text-sm transition-colors duration-200 {!child.external &&
									isActive(child.href)
										? 'bg-sky-600/20 text-white'
										: 'text-gray-300 hover:bg-slate-600/30 hover:text-white'}"
								>
									<ChildIcon class="h-4 w-4" aria-hidden="true" />
									<span>{child.label}</span>
								</a>
							{:else}
								{@render emptyGroup('px-3 py-2')}
							{/each}
						</div>
					{/if}
				</div>
			{:else}
				<a
					href={item.href}
					class="relative flex cursor-pointer items-center space-x-2 rounded-lg border-b-2 border-transparent px-4 py-2 text-sm font-medium transition-all duration-200 ease-in-out
					{isActive(item.href)
						? 'border-sky-400 bg-sky-600/20 text-white shadow-lg'
						: 'text-gray-300 hover:scale-105 hover:bg-white/10 hover:text-white'}"
					aria-current={isActive(item.href) ? 'page' : undefined}
				>
					<Icon class="h-4 w-4" aria-hidden="true" />
					<span>{item.label}</span>
				</a>
			{/if}
		{/each}
	</nav>
{/if}

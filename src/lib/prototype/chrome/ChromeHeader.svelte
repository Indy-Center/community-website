<script lang="ts">
	// PROTOTYPE (prototype/chrome): the header, built from the variant's choices.
	// Wide screens (lg and up) show the app's navigation in the header; below
	// that it moves into the phone menu.
	import IconApps from '~icons/mdi/apps';
	import IconChevronDown from '~icons/mdi/chevron-down';
	import IconMenu from '~icons/mdi/menu';
	import IconClose from '~icons/mdi/close';
	import IconLogin from '~icons/mdi/login';
	import { afterNavigate } from '$app/navigation';
	import Logo from '$lib/components/Logo.svelte';
	import MembershipBadge from '$lib/components/MembershipBadge.svelte';
	import Popover from './Popover.svelte';
	import AppsList from './AppsList.svelte';
	import AppNav from './AppNav.svelte';
	import SectionTabs from './SectionTabs.svelte';
	import UserMenuBody from './UserMenuBody.svelte';
	import {
		apps,
		appByKey,
		appExtras,
		initials,
		isCurrent,
		isGroup,
		type AppKey,
		type Member,
		type NavItem,
		type Variant
	} from './chrome';
	import { icons } from './icons';
	import { control, current, row, currentRow, groupLabel, focus } from './cls';
	import type { Scheme } from '$lib/prototype/palette/palettes';

	let {
		app,
		variant,
		nav,
		pathname,
		member,
		scheme,
		onscheme,
		onsignin,
		onsignout
	}: {
		app: AppKey;
		variant: Variant;
		nav: NavItem[];
		pathname: string;
		member: Member | undefined;
		scheme: Scheme;
		onscheme: (s: Scheme) => void;
		onsignin: () => void;
		onsignout: () => void;
	} = $props();

	const entry = $derived(appByKey(app));
	// User menu C moves the app's own items into its navigation.
	const items = $derived<NavItem[]>(
		variant.user === 'C' && member ? [...nav, ...appExtras[app]] : nav
	);
	const compactUser = $derived(variant.user !== 'A');
	const here = (href: string) => isCurrent(pathname, href, entry.home);

	let phoneOpen = $state(false);
	afterNavigate(() => (phoneOpen = false));

	const name = 'text-lg font-semibold whitespace-nowrap text-white';
	const brandLink = `inline-flex min-h-[var(--tap)] items-center rounded-lg px-1 ${focus}`;
	const signIn = `inline-flex min-h-[var(--tap)] cursor-pointer items-center gap-2 rounded-lg bg-sky-600 px-3 text-sm font-medium text-white hover:bg-sky-700 ${focus}`;
</script>

{#snippet appSwitcher()}
	<Popover
		label="Switch app"
		buttonClass="{control} px-1"
		panelClass="w-80 max-w-[calc(100vw-16px)]"
	>
		{#snippet trigger(open)}
			<IconChevronDown
				class="h-5 w-5 transition-transform {open ? 'rotate-180' : ''}"
				aria-hidden="true"
			/>
		{/snippet}
		<AppsList {app} />
	</Popover>
{/snippet}

{#snippet userTrigger(open: boolean)}
	{#if member && compactUser}
		<span
			class="flex h-8 w-8 items-center justify-center rounded-full bg-sky-700 text-xs font-semibold text-white ring-2 {open
				? 'ring-sky-400'
				: 'ring-transparent'}">{initials(member.name)}</span
		>
	{:else if member}
		<MembershipBadge size="sm" membership={member.membership} />
		<span class="font-medium">{member.name}</span>
		{#if member.atc}
			<span class="rounded-md bg-sky-600/30 px-2 py-0.5 font-mono text-xs text-sky-200"
				>{member.atc.short}</span
			>
		{/if}
		{#if member.pilot}
			<span class="rounded-md bg-pink-600/30 px-2 py-0.5 font-mono text-xs text-pink-200"
				>{member.pilot.short}</span
			>
		{/if}
		<IconChevronDown
			class="h-4 w-4 transition-transform {open ? 'rotate-180' : ''}"
			aria-hidden="true"
		/>
	{/if}
{/snippet}

{#snippet userMenu()}
	{#if member}
		<Popover
			label={compactUser ? `Account: ${member.name}` : undefined}
			align="right"
			buttonClass="{control} {compactUser ? 'rounded-full px-1' : ''}"
			panelClass="w-72"
		>
			{#snippet trigger(open)}{@render userTrigger(open)}{/snippet}
			<UserMenuBody {member} {app} mode={variant.user} {scheme} {onscheme} {onsignout} />
		</Popover>
	{:else}
		<button type="button" class={signIn} onclick={onsignin}>
			<IconLogin class="h-4 w-4" aria-hidden="true" />Sign in<span class="sr-only lg:not-sr-only"
				>&nbsp;with VATSIM</span
			>
		</button>
	{/if}
{/snippet}

<header
	data-chrome="header"
	class="sticky top-0 z-40 w-full border-b border-slate-700/50 bg-slate-800/95 backdrop-blur-lg"
>
	{#if variant.apps === 'B'}
		<nav aria-label="Indy Center apps" class="border-b border-slate-700/60 bg-gray-900">
			<ul class="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-2">
				{#each apps as a (a.key)}
					{@const on = a.key === app}
					<li class="shrink-0">
						<a
							href={a.home}
							aria-current={on ? 'true' : undefined}
							class="{control} text-xs {on ? current : ''}">{a.name}</a
						>
					</li>
				{/each}
			</ul>
		</nav>
	{/if}

	<div class="mx-auto flex min-h-16 w-full max-w-7xl items-center gap-2 px-2">
		<!-- Brand: where the mark or logo leads, and where the app's name leads. -->
		<div class="flex min-w-0 items-center gap-1">
			{#if variant.header === 'A'}
				<a href="/" class={brandLink} aria-label="Indy Center home">
					<Logo class="h-8 w-auto" />
				</a>
				{#if app !== 'hub'}
					<span class="mx-1 h-6 w-px bg-slate-600" aria-hidden="true"></span>
					<a href={entry.home} class="{brandLink} {name}">{entry.name}</a>
				{/if}
			{:else if variant.header === 'B'}
				<a href="/" class={brandLink} aria-label="Indy Center home">
					<img src="/prototype/chrome/mark-white.svg" alt="" class="h-9 w-auto" />
				</a>
				<a href={entry.home} class="{brandLink} {name}">{entry.name}</a>
			{:else}
				<a href={entry.home} class="{brandLink} gap-3">
					<Logo class="h-8 w-auto" />
					{#if app !== 'hub'}<span class={name}>{entry.name}</span>{/if}
				</a>
			{/if}
			{#if variant.apps === 'C'}{@render appSwitcher()}{/if}
		</div>

		<div class="ml-2 hidden lg:block">
			<AppNav {items} mode={variant.nav} {pathname} home={entry.home} />
		</div>

		<div class="ml-auto flex items-center gap-1">
			{#if variant.apps === 'A'}
				<Popover
					label="Indy Center apps"
					align="right"
					buttonClass={control}
					panelClass="w-80 max-w-[calc(100vw-16px)]"
				>
					{#snippet trigger()}
						<IconApps class="h-5 w-5" aria-hidden="true" /><span class="hidden sm:inline">Apps</span
						>
					{/snippet}
					<AppsList {app} />
				</Popover>
			{/if}

			<!-- The user menu: in the header on wide screens; on phones too when compact. -->
			<div class={compactUser ? '' : 'hidden lg:block'}>{@render userMenu()}</div>

			<button
				type="button"
				class="{control} lg:hidden"
				aria-expanded={phoneOpen}
				aria-controls="phone-menu"
				aria-label="Menu"
				onclick={() => (phoneOpen = !phoneOpen)}
			>
				{#if phoneOpen}<IconClose class="h-6 w-6" aria-hidden="true" />{:else}<IconMenu
						class="h-6 w-6"
						aria-hidden="true"
					/>{/if}
			</button>
		</div>
	</div>

	{#if variant.nav === 'C'}<SectionTabs {items} {pathname} home={entry.home} />{/if}

	<!-- Phone menu: the app's navigation (groups as headings), then the user. -->
	<div
		id="phone-menu"
		hidden={!phoneOpen}
		class="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-slate-700 lg:hidden"
	>
		<nav aria-label="Main" class="mx-auto max-w-7xl p-2">
			<ul class="space-y-1">
				{#each items as item (item.label)}
					{#if isGroup(item)}
						<li>
							<p class={groupLabel}>{item.label}</p>
							<ul class="space-y-1">
								{#each item.children as child (child.href)}
									{@const Icon = icons[child.icon]}
									<li>
										<a
											href={child.href}
											class="{row} pl-6 {here(child.href) ? currentRow : ''}"
											aria-current={here(child.href) ? 'page' : undefined}
										>
											<Icon class="h-5 w-5" aria-hidden="true" />{child.label}
										</a>
									</li>
								{/each}
							</ul>
						</li>
					{:else}
						{@const Icon = icons[item.icon]}
						<li>
							<a
								href={item.href}
								class="{row} {here(item.href) ? currentRow : ''}"
								aria-current={here(item.href) ? 'page' : undefined}
							>
								<Icon class="h-5 w-5" aria-hidden="true" />{item.label}
							</a>
						</li>
					{/if}
				{/each}
			</ul>
		</nav>
		{#if !compactUser}
			<div class="mx-auto max-w-7xl border-t border-slate-700 p-2">
				{#if member}
					<div class="rounded-lg bg-slate-700/40">
						<UserMenuBody {member} {app} mode={variant.user} {scheme} {onscheme} {onsignout} />
					</div>
				{:else}
					<button type="button" class="{signIn} w-full justify-center" onclick={onsignin}>
						<IconLogin class="h-4 w-4" aria-hidden="true" />Sign in with VATSIM
					</button>
				{/if}
			</div>
		{/if}
	</div>
</header>

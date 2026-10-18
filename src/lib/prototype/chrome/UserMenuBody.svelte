<script lang="ts">
	// PROTOTYPE (prototype/chrome): what the user menu holds. Shared by the
	// header's dropdown and the phone menu.
	// Every app: who you are (name, CID, ratings), profile and settings on the
	// hub, the colour scheme, sign out. User menu A and B add a section of the
	// app's own items; C leaves those to the app's navigation.
	import IconAccount from '~icons/mdi/account-circle';
	import IconCog from '~icons/mdi/cog';
	import IconLogout from '~icons/mdi/logout';
	import IconRating from '~icons/mdi/radar';
	import IconAirplane from '~icons/mdi/airplane';
	import IconNight from '~icons/mdi/weather-night';
	import IconSun from '~icons/mdi/white-balance-sunny';
	import MembershipBadge from '$lib/components/MembershipBadge.svelte';
	import { appByKey, appExtras, type AppKey, type Member } from './chrome';
	import { icons } from './icons';
	import { row, groupLabel, focus } from './cls';
	import type { Scheme } from '$lib/prototype/palette/palettes';

	let {
		member,
		app,
		mode,
		scheme,
		onscheme,
		onsignout
	}: {
		member: Member;
		app: AppKey;
		mode: string;
		scheme: Scheme;
		onscheme: (s: Scheme) => void;
		onsignout: () => void;
	} = $props();

	const extras = $derived(mode === 'C' ? [] : appExtras[app]);
	// The menu is drawn twice (dropdown and phone menu), so ids must differ.
	const uid = $props.id();
	const labelId = `scheme-${uid}`;
	const chip = 'inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-xs';
</script>

<div class="flex items-center gap-3 px-3 py-3">
	<MembershipBadge size="sm" membership={member.membership} />
	<div>
		<p class="text-sm font-semibold text-white">{member.name}</p>
		<p class="font-mono text-xs text-gray-400">CID {member.cid}</p>
		<p class="mt-1 flex gap-1">
			{#if member.atc}
				<span class="{chip} bg-sky-600/30 text-sky-200" title="ATC rating: {member.atc.long}">
					<IconRating class="h-3 w-3" aria-hidden="true" /><span class="sr-only">ATC rating</span
					>{member.atc.short}
				</span>
			{/if}
			{#if member.pilot}
				<span class="{chip} bg-pink-600/30 text-pink-200" title="Pilot rating: {member.pilot.long}">
					<IconAirplane class="h-3 w-3" aria-hidden="true" /><span class="sr-only"
						>Pilot rating</span
					>{member.pilot.short}
				</span>
			{/if}
		</p>
	</div>
</div>

<ul class="space-y-1 border-t border-slate-700 p-2">
	<li>
		<a href="/profile" class={row}><IconAccount class="h-4 w-4" aria-hidden="true" />My profile</a>
	</li>
	<li>
		<a href="/settings" class={row}><IconCog class="h-4 w-4" aria-hidden="true" />Settings</a>
	</li>
	<li>
		<div
			class="flex min-h-[var(--tap)] items-center justify-between gap-3 px-3 text-sm text-gray-300"
		>
			<span id={labelId}>Colour scheme</span>
			<div role="group" aria-labelledby={labelId} class="flex rounded-lg bg-slate-900 p-0.5">
				{#each [['dark', 'Dark', IconNight], ['light', 'Light', IconSun]] as const as [key, label, Icon] (key)}
					<button
						type="button"
						aria-pressed={scheme === key}
						onclick={() => onscheme(key)}
						class="inline-flex min-h-[var(--tap)] cursor-pointer items-center gap-1 rounded-md px-2 text-xs {focus} {scheme ===
						key
							? 'bg-slate-700 text-white'
							: 'text-gray-400 hover:text-white'}"
					>
						<Icon class="h-4 w-4" aria-hidden="true" />{label}
					</button>
				{/each}
			</div>
		</div>
	</li>
</ul>

{#if extras.length}
	<div class="border-t border-slate-700 p-2">
		<p class={groupLabel}>{appByKey(app).name}</p>
		<ul class="space-y-1">
			{#each extras as extra (extra.href)}
				{@const Icon = icons[extra.icon]}
				<li>
					<a href={extra.href} class={row}
						><Icon class="h-4 w-4" aria-hidden="true" />{extra.label}</a
					>
				</li>
			{/each}
		</ul>
	</div>
{/if}

<div class="border-t border-slate-700 p-2">
	<button
		type="button"
		onclick={onsignout}
		class="{row} cursor-pointer text-red-300 hover:text-red-200"
	>
		<IconLogout class="h-4 w-4" aria-hidden="true" />Sign out
	</button>
</div>

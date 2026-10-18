<script lang="ts">
	// PROTOTYPE (prototype/chrome): the footer, round 2. Every option is the
	// small map (apps, help, policies) beside the disclaimer, the map taking
	// about two thirds. A: map left, disclaimer right. B: as A, disclaimer in
	// a box. C: logo and disclaimer left, map right. Phones stack them.
	// Policies not written yet are shown, but not as links.
	import Logo from '$lib/components/Logo.svelte';
	import { apps, type AppKey } from './chrome';
	import { focus } from './cls';

	let { variant, app }: { variant: string; app: AppKey } = $props();

	type Item = { label: string; href?: string };
	const policies: Item[] = [
		{ label: 'Privacy policy' },
		{ label: 'Accessibility statement' },
		{ label: 'Community policy' }
	];
	const help: Item[] = [
		{ label: 'Contact us', href: '/contact' },
		{ label: 'Staff', href: '/staff' },
		{ label: 'Discord', href: 'https://discord.indy.center' }
	];
	const year = new Date().getFullYear();
	const link = `inline-flex min-h-[var(--tap)] items-center text-sm text-gray-300 underline-offset-4 hover:text-white hover:underline ${focus}`;
	const notYet = 'inline-flex min-h-[var(--tap)] items-center gap-1 text-sm text-gray-400';
	const heading = 'mb-1 text-xs font-semibold tracking-wider text-gray-400 uppercase';
</script>

{#snippet item(i: Item)}
	{#if i.href}
		<a href={i.href} class={link}>{i.label}</a>
	{:else}
		<span class={notYet}>{i.label}</span>
	{/if}
{/snippet}

{#snippet map()}
	<nav aria-label="Indy Center" class="grid grid-cols-2 gap-6 sm:grid-cols-3">
		<div>
			<h2 class={heading}>Apps</h2>
			<ul>
				{#each apps as a (a.key)}
					<li>
						<a href={a.home} class={link} aria-current={a.key === app ? 'true' : undefined}
							>{a.name}</a
						>
					</li>
				{/each}
			</ul>
		</div>
		<div>
			<h2 class={heading}>Help</h2>
			<ul>
				{#each help as i (i.label)}<li>{@render item(i)}</li>{/each}
			</ul>
		</div>
		<div>
			<h2 class={heading}>Policies</h2>
			<ul>
				{#each policies as i (i.label)}<li>{@render item(i)}</li>{/each}
			</ul>
			<p class="mt-1 text-xs text-gray-500">Not written yet.</p>
		</div>
	</nav>
{/snippet}

{#snippet disclaimer()}
	<p class="text-xs leading-relaxed text-gray-400">
		This site is not affiliated with the Federal Aviation Administration or any governing aviation
		body. All content contained herein is approved only for use on the VATSIM network.
	</p>
	<p class="mt-2 text-xs text-gray-500">Copyright {year} Indy Center</p>
{/snippet}

<footer data-chrome="footer" class="shrink-0 border-t border-slate-800 bg-gray-900">
	<div class="mx-auto grid max-w-6xl gap-8 px-4 py-8 md:grid-cols-3">
		{#if variant === 'C'}
			<div class="md:col-span-1">
				<Logo class="mb-3 h-8 w-auto" />
				{@render disclaimer()}
			</div>
			<div class="md:col-span-2">{@render map()}</div>
		{:else}
			<div class="md:col-span-2">{@render map()}</div>
			<div
				class="md:col-span-1 {variant === 'B'
					? 'self-start rounded-lg border border-slate-700 p-4'
					: 'md:pt-5'}"
			>
				{@render disclaimer()}
			</div>
		{/if}
	</div>
</footer>

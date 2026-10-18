<script lang="ts">
	import '../app.css';
	import Header from '$lib/components/header/Header.svelte';
	import { page } from '$app/state';
	import { dev } from '$app/environment';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { palettes, paletteCss, type Scheme } from '$lib/prototype/palette/palettes';
	import ChromeHeader from '$lib/prototype/chrome/ChromeHeader.svelte';
	import ChromeFooter from '$lib/prototype/chrome/ChromeFooter.svelte';
	import ChromeBar from '$lib/prototype/chrome/ChromeBar.svelte';
	import {
		appForPath,
		navs,
		pageFirst,
		parseVariant,
		sampleMember,
		touchPx,
		variantCode,
		type Member,
		type Variant
	} from '$lib/prototype/chrome/chrome';

	let { children, data } = $props();

	// PROTOTYPE (prototype/chrome): the URL's ?variant=&scheme=&signed= win,
	// else the last choice from the cookie, so it holds while you browse and
	// move between apps.
	let saved = $state(data.chromePrototype);
	const choice = $derived.by(() => {
		const url = page.url.searchParams;
		const cookie = new URLSearchParams(saved);
		const get = (k: string) => url.get(k) ?? cookie.get(k);
		return {
			variant: parseVariant(get('variant')),
			scheme: (get('scheme') === 'light' ? 'light' : 'dark') as Scheme,
			signedIn: get('signed') !== '0'
		};
	});
	function choose(next: { variant: Variant; scheme: Scheme; signedIn: boolean }) {
		const qs = new URLSearchParams({
			variant: variantCode(next.variant),
			scheme: next.scheme,
			signed: next.signedIn ? '1' : '0'
		});
		saved = qs.toString();
		document.cookie = `chrome-prototype=${encodeURIComponent(saved)}; path=/; max-age=2592000; samesite=lax`;
		const url = new URL(page.url);
		for (const [k, v] of qs) url.searchParams.set(k, v);
		goto(url, { replaceState: true, noScroll: true, keepFocus: true });
	}

	// The settled palette: dark A with the AA fixes, light L4 (framed).
	const settled = palettes.find((p) => p.key === 'L4')!;

	const app = $derived(appForPath(page.url.pathname));
	const member = $derived.by((): Member | undefined => {
		if (!choice.signedIn) return undefined;
		const u = data.user;
		if (!u) return sampleMember;
		const { rating, pilotrating } = u.data.vatsim;
		return {
			name: u.preferredName || `${u.firstName} ${u.lastName}`,
			cid: u.cid,
			membership: u.membership,
			atc: u.membership === 'controller' && rating.short ? rating : undefined,
			pilot: pilotrating.id > 0 ? pilotrating : undefined
		};
	});

	// Page titles, page first. The site's pages still write `Indy Center | X`;
	// rewrite them here rather than edit every page.
	let title = $state('');
	onMount(() => {
		if (!dev) return;
		const fix = () => {
			const next = pageFirst(document.title);
			if (next !== document.title) document.title = next;
			title = document.title;
		};
		fix();
		const watch = new MutationObserver(fix);
		watch.observe(document.head, { subtree: true, childList: true, characterData: true });
		return () => watch.disconnect();
	});

	let barHeight = $state(0);

	// Check if current page is home
	let isHomePage = $derived(page.url.pathname === '/');
</script>

<svelte:head>
	<title>Indy Center | Welcome to Indy</title>
	{#if dev}
		{@html `<style id="palette-prototype">${paletteCss(settled, choice.scheme)}</style>`}
	{/if}
</svelte:head>

{#if dev}
	<div
		class="flex min-h-screen w-full flex-col bg-gray-900"
		style="--tap:{touchPx[choice.variant.touch]}px"
	>
		<ChromeHeader
			{app}
			variant={choice.variant}
			nav={navs[app]}
			pathname={page.url.pathname}
			{member}
			scheme={choice.scheme}
			onscheme={(scheme) => choose({ ...choice, scheme })}
			onsignin={() => choose({ ...choice, signedIn: true })}
			onsignout={() => choose({ ...choice, signedIn: false })}
		/>
		<main class="flex w-full flex-1 flex-col">
			{#if isHomePage}
				{@render children?.()}
			{:else}
				<div class="w-full bg-gray-900">
					<div class="mx-auto max-w-6xl px-4 py-8">
						{@render children?.()}
					</div>
				</div>
			{/if}
		</main>
		<ChromeFooter variant={choice.variant.footer} {app} />
		<div style="height:{barHeight + 16}px" class="bg-gray-900" aria-hidden="true"></div>
	</div>
	<ChromeBar
		variant={choice.variant}
		scheme={choice.scheme}
		signedIn={choice.signedIn}
		{title}
		onchange={choose}
		bind:height={barHeight}
	/>
{:else}
	<div class="flex min-h-screen w-full flex-col bg-gray-900">
		<div
			class="absolute top-0 z-20 w-full border-b border-slate-700/50 bg-slate-800/95 backdrop-blur-lg"
		>
			<Header {data} />
		</div>
		<main class="flex w-full flex-1 flex-col">
			{#if isHomePage}
				{@render children?.()}
			{:else}
				<!-- Standard page layout for non-home pages -->
				<div class="w-full bg-gray-900 pt-16">
					<div class="mx-auto max-w-6xl px-4 py-8">
						{@render children?.()}
					</div>
				</div>
			{/if}
		</main>
		<footer class="flex shrink-0 items-center justify-center bg-gray-900 py-3">
			<div class="mx-auto max-w-6xl px-4 text-center">
				<p class="mb-1 text-xs leading-tight text-gray-400">
					This site is not affiliated with the Federal Aviation Administration or any governing
					aviation body. All content contained herein is approved only for use on the VATSIM
					network.
				</p>
				<p class="text-xs leading-tight text-gray-500">
					Copyright {new Date().getFullYear()} Indy Center
				</p>
			</div>
		</footer>
	</div>
{/if}

<script lang="ts">
	import '../app.css';
	import Header from '$lib/components/header/Header.svelte';
	import { page } from '$app/state';
	import { dev } from '$app/environment';
	import { goto } from '$app/navigation';
	import { paletteCss, readChoice, type Scheme } from '$lib/prototype/palette/palettes';
	import PaletteSwitcher from '$lib/prototype/palette/PaletteSwitcher.svelte';

	let { children, data } = $props();

	// PROTOTYPE (prototype/palette): the URL's ?variant=&scheme= win, else
	// the last choice from the cookie, so it holds while you browse the site.
	let saved = $state(data.palettePrototype);
	const choice = $derived.by(() => {
		const url = page.url.searchParams;
		const fromUrl = ['variant', 'scheme'].some((k) => url.has(k));
		const source = fromUrl ? url : new URLSearchParams(saved);
		return readChoice((k) => source.get(k));
	});
	function choose(next: { variant: string; scheme: Scheme }) {
		const qs = new URLSearchParams({ variant: next.variant, scheme: next.scheme });
		saved = qs.toString();
		document.cookie = `palette-prototype=${encodeURIComponent(saved)}; path=/; max-age=2592000; samesite=lax`;
		const url = new URL(page.url);
		for (const [k, v] of qs) url.searchParams.set(k, v);
		goto(url, { replaceState: true, noScroll: true, keepFocus: true });
	}

	// Check if current page is home
	let isHomePage = $derived(page.url.pathname === '/');
</script>

<svelte:head>
	<title>Indy Center | Welcome to Indy</title>
	{#if dev}
		{@html `<style id="palette-prototype">${paletteCss(choice.palette, choice.scheme)}</style>`}
	{/if}
</svelte:head>

{#if dev}
	<PaletteSwitcher palette={choice.palette} scheme={choice.scheme} onchange={choose} />
{/if}

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
				aviation body. All content contained herein is approved only for use on the VATSIM network.
			</p>
			<p class="text-xs leading-tight text-gray-500">
				Copyright {new Date().getFullYear()} Indy Center
			</p>
		</div>
	</footer>
</div>

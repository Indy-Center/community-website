<script lang="ts">
	import '../app.css';
	import Header from '$lib/components/header/Header.svelte';
	import { page } from '$app/state';
	import { dev } from '$app/environment';
	import { goto } from '$app/navigation';
	import { palettes, paletteCss } from '$lib/prototype/palette/palettes';
	import {
		choiceParams,
		filesFor,
		readChoice,
		typeCss,
		type TypeChoice
	} from '$lib/prototype/type/type';
	import TypeBar from '$lib/prototype/type/TypeBar.svelte';

	let { children, data } = $props();

	// PROTOTYPE (prototype/type): each of ?font=&mono=&scale=&scheme= comes
	// from the URL, else the last choice from the cookie, so it holds while
	// you browse the site.
	let saved = $state(data.typePrototype);
	const choice = $derived.by(() => {
		const url = page.url.searchParams;
		const cookie = new URLSearchParams(saved);
		return readChoice((k) => url.get(k) ?? cookie.get(k));
	});
	function remember(c: TypeChoice) {
		saved = new URLSearchParams(choiceParams(c)).toString();
		document.cookie = `type-prototype=${encodeURIComponent(saved)}; path=/; max-age=2592000; samesite=lax`;
	}
	function choose(next: TypeChoice) {
		remember(next);
		const url = new URL(page.url);
		for (const [k, v] of Object.entries(choiceParams(next))) url.searchParams.set(k, v);
		goto(url, { replaceState: true, noScroll: true, keepFocus: true });
	}
	// A shared link's choice holds as you browse on from it.
	$effect(() => {
		const url = page.url.searchParams;
		if (['font', 'mono', 'scale', 'scheme'].some((k) => url.has(k))) remember(choice);
	});

	// The settled palette: dark A with the AA fixes, light L4 (framed).
	const settled = palettes.find((p) => p.key === 'L4')!;

	// Check if current page is home
	let isHomePage = $derived(page.url.pathname === '/');
</script>

<svelte:head>
	<title>Indy Center | Welcome to Indy</title>
	{#if dev}
		{@html `<style id="palette-prototype">${paletteCss(settled, choice.scheme)}</style>`}
		<!-- Italic loads only on a page that sets italic text. -->
		{#each filesFor(choice).filter((f) => f.style === 'normal') as f (f.url)}
			<link rel="preload" href={f.url} as="font" type="font/woff2" crossorigin="anonymous" />
		{/each}
		{@html `<style id="type-prototype">${typeCss(choice)}</style>`}
	{/if}
</svelte:head>

{#if dev}
	<TypeBar {choice} onchange={choose} />
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

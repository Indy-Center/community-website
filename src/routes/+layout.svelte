<script lang="ts">
	import '../app.css';
	import Header from '$lib/components/Header.svelte';
	import { page } from '$app/stores';

	let { children, data } = $props();

	// Check if current page is home
	let isHomePage = $derived($page.url.pathname === '/');
</script>

<svelte:head>
	<title>Indy Center | Welcome to Indy</title>
</svelte:head>

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

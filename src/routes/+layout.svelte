<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import Header from '$lib/components/Header.svelte';

	let { children, data } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Indy Center | Welcome to Indy</title>
</svelte:head>

<div class="flex min-h-screen w-full flex-col bg-gray-900">
	<div class="absolute top-0 z-20 w-full">
		<Header {data} />
	</div>
	<main class="flex w-full flex-1 flex-col">
		{@render children?.()}
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

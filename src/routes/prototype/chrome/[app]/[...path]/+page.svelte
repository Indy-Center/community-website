<script lang="ts">
	// PROTOTYPE (prototype/chrome): a stand-in page in training or the library.
	import { pageTitle } from '$lib/prototype/chrome/chrome';

	let { data } = $props();

	const rows = ['First item', 'Second item', 'Third item'];
</script>

<svelte:head>
	<title>{pageTitle(data.page.title, data.app)}</title>
</svelte:head>

<div class="mb-8">
	<h1 class="text-3xl font-bold text-white">{data.page.title}</h1>
	<p class="mt-2 text-gray-400">{data.page.intro}</p>
</div>

<div class="grid gap-6 md:grid-cols-2">
	{#each ['Placeholder section', 'Another section'] as heading (heading)}
		<section class="rounded-lg border border-slate-700/60 bg-slate-800/60 text-white">
			<h2
				class="border-b border-slate-700/60 px-4 py-3 text-sm font-semibold tracking-wide uppercase"
			>
				{heading}
			</h2>
			<ul class="divide-y divide-slate-700/60">
				{#each rows as row (row)}
					<li class="px-4 py-3 text-sm text-gray-300">{row}</li>
				{/each}
			</ul>
		</section>
	{/each}
</div>

<p class="mt-8">
	<button
		type="button"
		class="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-6 py-3 text-sm font-medium text-white hover:bg-sky-700"
		>A button, for scale</button
	>
</p>

<script lang="ts">
	import Panel from '$lib/components/Panel.svelte';
	import IconHandshake from '~icons/mdi/handshake';
	import IconCloudOff from '~icons/mdi/cloud-off-outline';

	let { data } = $props();
</script>

<svelte:head>
	<title>Indy Center | Partners</title>
</svelte:head>

<!-- Page Header -->
<div class="mb-8">
	<h1 class="text-3xl font-bold text-white">Partners</h1>
	{#if data.state === 'listed'}
		<p class="mt-2 text-gray-400">
			The developers, creators, and communities we're proud to work with.
		</p>
	{/if}
</div>

{#if data.state === 'listed'}
	{#each data.categories as category (category.id)}
		<section class="mb-10">
			<h2 class="mb-1 text-sm font-semibold tracking-widest text-sky-400 uppercase">
				{category.name}
			</h2>
			<p class="mb-4 text-sm text-gray-400">{category.blurb}</p>
			<div class="grid gap-4 md:grid-cols-2">
				{#each category.partners as partner (partner.slug)}
					<article class="rounded-xl border border-slate-700/60 bg-slate-800/60 p-5 shadow-sm">
						<h3 class="text-lg font-bold text-white">
							<a href="/partners/{partner.slug}" class="hover:text-sky-300">{partner.name}</a>
						</h3>
						<p class="mt-2 text-sm leading-relaxed text-slate-300">{partner.tagline}</p>
					</article>
				{/each}
			</div>
		</section>
	{/each}
{:else if data.state === 'coming-soon'}
	<div class="mx-auto max-w-4xl">
		<Panel title="Coming Soon" icon={IconHandshake} mode="dark">
			<div class="p-8">
				<p class="leading-relaxed text-slate-300">
					We're putting together a page to highlight the groups and organizations we partner with.
					Check back soon!
				</p>
			</div>
		</Panel>
	</div>
{:else}
	<div class="mx-auto max-w-4xl">
		<Panel title="Unavailable" icon={IconCloudOff} mode="dark">
			<div class="p-8">
				<p class="leading-relaxed text-slate-300">Partners couldn't be loaded, try again later.</p>
			</div>
		</Panel>
	</div>
{/if}

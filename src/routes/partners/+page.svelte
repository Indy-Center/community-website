<script lang="ts">
	import Panel from '$lib/components/Panel.svelte';
	import ImageWithFallback from '$lib/components/ui/ImageWithFallback.svelte';
	import IconHandshake from '~icons/mdi/handshake';
	import IconPencil from '~icons/mdi/pencil';

	let { data } = $props();
</script>

<svelte:head>
	<title>Indy Center | Partners</title>
</svelte:head>

<div class="mb-8 flex items-start justify-between gap-3">
	<div>
		<h1 class="text-3xl font-bold text-white">Partners</h1>
		<p class="mt-2 text-gray-400">
			The developers, creators, and communities we're proud to work with.
		</p>
	</div>
	{#if data.canManage}
		<a
			href="/admin/partners"
			class="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-600 bg-slate-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:bg-slate-600"
		>
			<IconPencil class="h-4 w-4" />
			Manage Partners
		</a>
	{/if}
</div>

{#each data.groups as group (group.key)}
	<section class="mb-10">
		<div class="mb-4">
			<h2 class="text-xl font-semibold text-white">{group.label}</h2>
			<p class="mt-1 text-sm text-gray-400">{group.description}</p>
		</div>
		<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
			{#each group.partners as partner (partner.slug)}
				<a
					href="/partners/{partner.slug}"
					class="group flex flex-col rounded-lg border border-slate-700/60 bg-slate-800/60 shadow-sm backdrop-blur-sm transition-all hover:border-sky-500/50 hover:bg-slate-700/60"
				>
					<!-- Positioned so a large logo can't stretch the tile past 3:2 -->
					<div class="relative aspect-[3/2]">
						<ImageWithFallback
							src={partner.logoUrl}
							alt="{partner.name} logo"
							fallbackIcon={IconHandshake}
							class="absolute inset-0 h-full w-full object-contain p-4"
						/>
					</div>
					<div
						class="border-t border-slate-700/60 px-3 py-2 text-center text-sm font-semibold text-white group-hover:text-sky-300"
					>
						{partner.name}
					</div>
				</a>
			{/each}
		</div>
	</section>
{:else}
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
{/each}

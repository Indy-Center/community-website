<script lang="ts">
	import Badge from '$lib/components/Badge.svelte';
	import ImageWithFallback from '$lib/components/ui/ImageWithFallback.svelte';
	import { getPartnerCategory } from '$lib/config/partners';
	import IconHandshake from '~icons/mdi/handshake';
	import IconOpenInNew from '~icons/mdi/open-in-new';
	import IconPencil from '~icons/mdi/pencil';

	let { data } = $props();

	const partner = $derived(data.partner);
	const category = $derived(getPartnerCategory(partner.category));
</script>

<svelte:head>
	<title>Indy Center | {partner.name}</title>
</svelte:head>

<div class="mb-6">
	<a href="/partners" class="text-sm text-sky-400 hover:text-sky-300">← All partners</a>
</div>

<div class="mx-auto max-w-4xl">
	<div class="rounded-lg border border-slate-700/60 bg-slate-800/60 shadow-sm backdrop-blur-sm">
		<div
			class="flex flex-col items-center gap-6 border-b border-slate-700/60 px-6 py-6 sm:flex-row sm:items-center"
		>
			<div
				class="flex h-32 w-48 shrink-0 items-center justify-center rounded-lg bg-slate-900/60 p-3"
			>
				<ImageWithFallback
					src={partner.logoUrl}
					alt="{partner.name} logo"
					loading="eager"
					fallbackIcon={IconHandshake}
					class="h-full w-full object-contain"
				/>
			</div>
			<div class="min-w-0 flex-1 text-center sm:text-left">
				<h1 class="text-3xl font-bold text-white">{partner.name}</h1>
				<div class="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
					{#if category}
						<Badge size="sm" label={category.label} />
					{/if}
					{#if !partner.isPublished}
						<Badge size="sm" color="yellow" label="Draft - only admins can see this" />
					{/if}
				</div>
			</div>
			{#if data.canManage}
				<a
					href="/admin/partners/{partner.id}"
					class="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-600 bg-slate-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:bg-slate-600"
				>
					<IconPencil class="h-4 w-4" />
					Edit
				</a>
			{/if}
		</div>

		<div class="space-y-6 px-6 py-6">
			<p class="leading-relaxed whitespace-pre-line text-slate-300">{partner.description}</p>

			{#if partner.links.length > 0}
				<div class="flex flex-wrap gap-3">
					{#each partner.links as link, index (index)}
						<a
							href={link.url}
							target="_blank"
							rel="noopener noreferrer"
							class="inline-flex items-center gap-2 rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-2.5 text-sm font-medium text-sky-300 transition-all hover:bg-sky-500/20"
						>
							{link.label}
							<IconOpenInNew class="h-4 w-4" />
						</a>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>

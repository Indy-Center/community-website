<script lang="ts">
	import Panel from '$lib/components/Panel.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import SocialIcon, { platformName } from '$lib/components/partners/SocialIcon.svelte';
	import IconHandshake from '~icons/mdi/handshake';
	import PartnersUnavailable from '$lib/components/partners/PartnersUnavailable.svelte';
	import IconImages from '~icons/mdi/image-multiple';
	import IconStar from '~icons/mdi/star-four-points';

	let { data } = $props();

	let chosenCategoryId = $state<string | null>(null);
	/** The partner category the chips narrow the page to; null is All, as is one no longer listed. */
	const activeCategoryId = $derived(
		data.state === 'listed' && data.categories.some((c) => c.id === chosenCategoryId)
			? chosenCategoryId
			: null
	);
	const shownCategories = $derived(
		data.state === 'listed'
			? data.categories.filter((c) => activeCategoryId === null || c.id === activeCategoryId)
			: []
	);
</script>

<svelte:head>
	<title>Indy Center | Partners</title>
</svelte:head>

<!-- Page Header -->
<div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
	<div>
		<h1 class="text-3xl font-bold text-white">Partners</h1>
		{#if data.state === 'listed'}
			<p class="mt-2 text-gray-400">
				The developers, creators, and communities we're proud to work with.
			</p>
		{/if}
	</div>
	{#if data.state === 'listed'}
		<div class="flex flex-wrap gap-2" role="group" aria-label="Filter by partner category">
			{#each [{ id: null, name: 'All' }, ...data.categories] as chip (chip.id)}
				<button
					type="button"
					aria-pressed={activeCategoryId === chip.id}
					onclick={() => (chosenCategoryId = chip.id)}
					class="rounded-full border px-4 py-1.5 text-sm font-medium {activeCategoryId === chip.id
						? 'border-sky-500 bg-sky-500/20 text-sky-200'
						: 'border-slate-600 text-slate-300 hover:bg-slate-700'}">{chip.name}</button
				>
			{/each}
		</div>
	{/if}
</div>

{#if data.state === 'listed'}
	{#each shownCategories as category (category.id)}
		<section class="mb-10">
			<h2 class="mb-1 text-sm font-semibold tracking-widest text-sky-400 uppercase">
				{category.name}
			</h2>
			<p class="mb-4 text-sm text-gray-400">{category.blurb}</p>
			<div class="grid gap-4 md:grid-cols-2">
				{#each category.partners as partner (partner.slug)}
					<article
						class="flex flex-col rounded-xl border border-slate-700/60 bg-slate-800/60 p-5 shadow-sm"
					>
						<div class="flex items-center gap-4">
							<div class="h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-slate-900/60">
								<img
									src={partner.logo.url}
									alt=""
									width={partner.logo.width}
									height={partner.logo.height}
									loading="lazy"
									class="h-full w-full object-contain p-1.5"
								/>
							</div>
							<div class="min-w-0">
								<h3 class="truncate text-lg font-bold text-white">
									<a href="/partners/{partner.slug}" class="hover:text-sky-300">{partner.name}</a>
								</h3>
								{#if partner.socialLinks.length}
									<div class="mt-1 flex flex-wrap gap-2 text-slate-400">
										{#each partner.socialLinks as link}
											<a
												href={link.url}
												class="hover:text-white"
												aria-label="{partner.name} on {platformName(link.platform)}"
												title={platformName(link.platform)}
											>
												<SocialIcon platform={link.platform} class="h-4 w-4" />
											</a>
										{/each}
									</div>
								{/if}
							</div>
						</div>
						<p class="mt-4 line-clamp-3 flex-1 text-sm leading-relaxed text-slate-300">
							{partner.tagline}
						</p>
						{#if partner.hasMemberPerk}
							<div class="mt-3">
								<Badge size="sm" color="yellow" icon={IconStar} label="Member perk" />
							</div>
						{/if}
						<div class="mt-4 flex flex-wrap items-center gap-3">
							{#if partner.callToAction}
								<a
									href={partner.callToAction.url}
									class="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
									>{partner.callToAction.label}</a
								>
							{/if}
							{#if partner.photoCount > 0}
								<span class="ml-auto flex items-center gap-1 text-xs text-slate-500">
									<IconImages class="h-4 w-4" aria-hidden="true" />
									{partner.photoCount}
									<span class="sr-only">{partner.photoCount === 1 ? 'photo' : 'photos'}</span>
								</span>
							{/if}
						</div>
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
	<PartnersUnavailable />
{/if}

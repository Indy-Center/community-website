<script lang="ts">
	import {
		Badge,
		Button,
		Card,
		EmptyState,
		Heading,
		Icon,
		PageHeader,
		Text
	} from '@indy-center/centerline-svelte';
	import { mdiHandshake, mdiImageMultiple, mdiStarFourPoints } from '@mdi/js';
	import SocialLink from '$lib/components/partners/SocialLink.svelte';
	import PartnerImage from '$lib/components/partners/PartnerImage.svelte';
	import PartnersUnavailable from '$lib/components/partners/PartnersUnavailable.svelte';

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
	<title>Partners | Indy Center</title>
</svelte:head>

<PageHeader title="Partners" class="mb-8">
	{#if data.state === 'listed'}
		The developers, creators, and communities we're proud to work with.
	{/if}
	{#snippet actions()}
		{#if data.state === 'listed'}
			<div class="flex flex-wrap gap-2" role="group" aria-label="Filter by partner category">
				{#each [{ id: null, name: 'All' }, ...data.categories] as chip (chip.id)}
					<Button
						variant="secondary"
						size="sm"
						pressed={activeCategoryId === chip.id}
						onclick={() => (chosenCategoryId = chip.id)}
					>
						{chip.name}
					</Button>
				{/each}
			</div>
		{/if}
	{/snippet}
</PageHeader>

{#if data.state === 'listed'}
	{#each shownCategories as category (category.id)}
		<section class="mb-10" aria-labelledby="category-{category.id}">
			<Heading level={2} look={3} id="category-{category.id}">{category.name}</Heading>
			<Text size="small" class="mt-1 mb-4">{category.blurb}</Text>
			<ul class="grid gap-4 md:grid-cols-2">
				{#each category.partners as partner (partner.slug)}
					<Card as="li" class="flex flex-col">
						<div class="flex items-center gap-4">
							<div class="h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
								<PartnerImage
									image={partner.logo}
									loading="lazy"
									class="h-full w-full object-contain p-1.5"
								/>
							</div>
							<div class="min-w-0">
								<Heading level={3} look={4} class="truncate">
									<a
										href="/partners/{partner.slug}"
										class="hover:underline focus-visible:rounded focus-visible:outline-2 focus-visible:outline-ring"
										>{partner.name}</a
									>
								</Heading>
								{#if partner.socialLinks.length}
									<div class="-ml-3.5 flex flex-wrap">
										{#each partner.socialLinks as link, i (i)}
											<SocialLink partnerName={partner.name} {link} variant="card" />
										{/each}
									</div>
								{/if}
							</div>
						</div>
						<p class="mt-4 line-clamp-3 flex-1 text-sm">{partner.tagline}</p>
						{#if partner.hasMemberPerk}
							<div class="mt-3">
								<Badge size="sm" variant="yellow">
									{#snippet icon()}<Icon path={mdiStarFourPoints} />{/snippet}
									Member perk
								</Badge>
							</div>
						{/if}
						<div class="mt-4 flex flex-wrap items-center gap-3">
							{#if partner.callToAction}
								<Button href={partner.callToAction.url}>{partner.callToAction.label}</Button>
							{/if}
							{#if partner.photoCount > 0}
								<Text as="span" size="small" class="ml-auto flex items-center gap-1">
									<Icon path={mdiImageMultiple} />
									{partner.photoCount}
									<span class="sr-only">{partner.photoCount === 1 ? 'photo' : 'photos'}</span>
								</Text>
							{/if}
						</div>
					</Card>
				{/each}
			</ul>
		</section>
	{/each}
{:else if data.state === 'coming-soon'}
	<EmptyState title="Coming soon" level={2}>
		{#snippet icon()}<Icon path={mdiHandshake} />{/snippet}
		We're putting together a page to highlight the groups and organizations we partner with. Check back
		soon.
	</EmptyState>
{:else}
	<PartnersUnavailable />
{/if}

<script lang="ts">
	import { page } from '$app/state';
	import {
		Breadcrumbs,
		Button,
		Card,
		Heading,
		Icon,
		Link,
		Panel,
		Text
	} from '@indy-center/centerline-svelte';
	import { mdiImageMultiple, mdiLockOutline, mdiStarFourPoints, mdiTextLong } from '@mdi/js';
	import { signInHref } from '$lib/utils/signIn';
	import SocialLink from '$lib/components/partners/SocialLink.svelte';
	import PartnersUnavailable from '$lib/components/partners/PartnersUnavailable.svelte';
	import PhotoViewer from '$lib/components/partners/PhotoViewer.svelte';
	import PartnerImage from '$lib/components/partners/PartnerImage.svelte';
	import type { VisibleMemberPerks } from './+page.server';

	let { data } = $props();

	/** The photo open full screen, if any. */
	let openPhoto = $state<number | null>(null);
</script>

<!-- Signed in: each perk's text and its button. A guest's data holds only the count, so they get
     the invitation to join instead. -->
{#snippet perkBody(partnerName: string, memberPerks: VisibleMemberPerks)}
	{#if memberPerks.signedIn}
		<div class="flex flex-col gap-4">
			{#each memberPerks.perks as perk, i (i)}
				<div class="flex flex-col items-start gap-3">
					<p>{perk.text}</p>
					<Button href={perk.url}>
						<Icon path={mdiStarFourPoints} />
						{perk.label}
					</Button>
				</div>
			{/each}
		</div>
	{:else}
		{@const onePerk = memberPerks.count === 1}
		<div class="flex flex-col gap-3">
			<p>
				Indy Center members get {onePerk ? 'a perk' : `${memberPerks.count} perks`} from {partnerName}.
				Join Indy Center to get {onePerk ? 'it' : 'them'}.
			</p>
			<div class="flex flex-col gap-3 sm:flex-row sm:items-center">
				<Button href="/visit/become-community-member">
					<Icon path={mdiLockOutline} />
					Join Indy Center
				</Button>
				<Link href={signInHref(page.url.pathname)}>Already a member? Sign in</Link>
			</div>
		</div>
	{/if}
{/snippet}

<svelte:head>
	<title>{data.state === 'found' ? data.partner.name : 'Partners'} | Indy Center</title>
</svelte:head>

<Breadcrumbs
	class="mb-4"
	items={[
		{ label: 'Partners', href: '/partners' },
		{ label: data.state === 'found' ? data.partner.name : 'Partner', href: page.url.pathname }
	]}
/>

{#if data.state === 'found'}
	{@const partner = data.partner}
	{@const hasPerks = partner.memberPerks.count > 0}
	<!-- The right column: the member perk panel above the photos. -->
	{@const hasRightColumn = partner.gallery.length > 0 || hasPerks}

	<Card flush class="mb-8 overflow-hidden">
		<!-- The banner band is dark in both schemes, so its text reads over the photo -->
		<div class="relative" data-theme="dark">
			{#if partner.banner}
				<PartnerImage image={partner.banner} class="absolute inset-0 h-full w-full object-cover" />
			{:else}
				<div class="absolute inset-0 bg-card"></div>
			{/if}
			<div
				class="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent"
			></div>
			<div class="relative flex items-end gap-3 px-4 pt-32 pb-4 sm:gap-4 sm:px-6 sm:pt-40 lg:pt-48">
				<div class="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-background sm:h-20 sm:w-20">
					<PartnerImage image={partner.logo} class="h-full w-full object-contain p-1.5" />
				</div>
				<div class="min-w-0">
					<Text as="div" size="small" class="font-semibold tracking-widest uppercase">
						{data.categoryName}
					</Text>
					<Heading level={1} class="mt-1 break-words">{partner.name}</Heading>
					<p class="mt-1 line-clamp-2 text-sm text-foreground-soft">{partner.tagline}</p>
				</div>
			</div>
		</div>

		{#if partner.callsToAction.length || partner.socialLinks.length}
			<div
				class="flex flex-col gap-4 border-t border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
			>
				{#if partner.callsToAction.length}
					<div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
						{#each partner.callsToAction as callToAction, i (i)}
							<Button href={callToAction.url} variant={i === 0 ? 'primary' : 'secondary'}>
								{callToAction.label}
							</Button>
						{/each}
					</div>
				{/if}
				{#if partner.socialLinks.length}
					<div class="flex flex-wrap gap-2">
						{#each partner.socialLinks as link, i (i)}
							<SocialLink partnerName={partner.name} {link} variant="bar" />
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	</Card>

	<div class="grid gap-8 lg:grid-cols-3">
		<div class={hasRightColumn ? 'lg:col-span-2' : 'lg:col-span-3'}>
			<Panel title="About" level={2}>
				{#snippet icon()}<Icon path={mdiTextLong} />{/snippet}
				<div class="flex flex-col gap-4">
					{#each partner.paragraphs as paragraph, i (i)}
						<p>{paragraph}</p>
					{/each}
				</div>
			</Panel>
		</div>

		{#if hasRightColumn}
			<!-- On phones this column dissolves into the grid, and the perk panel moves above About so
			     it isn't buried under a long description. -->
			<div class="contents lg:flex lg:flex-col lg:gap-8">
				{#if hasPerks}
					<div class="max-lg:order-first">
						<Panel
							title={partner.memberPerks.count === 1 ? 'Member perk' : 'Member perks'}
							level={2}
						>
							{#snippet icon()}<Icon path={mdiStarFourPoints} />{/snippet}
							{@render perkBody(partner.name, partner.memberPerks)}
						</Panel>
					</div>
				{/if}

				{#if partner.gallery.length}
					<Panel title="Photos" level={2}>
						{#snippet icon()}<Icon path={mdiImageMultiple} />{/snippet}
						{@const featured = partner.gallery[0].large}
						<div class="flex flex-col gap-2">
							<button
								type="button"
								class="block w-full overflow-hidden rounded-md focus-visible:outline-2 focus-visible:outline-ring"
								aria-label="Open photo 1 of {partner.gallery.length}"
								onclick={() => (openPhoto = 0)}
							>
								<PartnerImage image={featured} class="aspect-[4/3] w-full object-cover" />
							</button>
							{#if partner.gallery.length > 1}
								<div class="grid grid-cols-4 gap-2">
									{#each partner.gallery.slice(1) as photo, i (i)}
										<button
											type="button"
											class="overflow-hidden rounded-md focus-visible:outline-2 focus-visible:outline-ring"
											aria-label="Open photo {i + 2} of {partner.gallery.length}"
											onclick={() => (openPhoto = i + 1)}
										>
											<PartnerImage
												image={photo.thumbnail}
												loading="lazy"
												class="aspect-square w-full object-cover"
											/>
										</button>
									{/each}
								</div>
							{/if}
						</div>
					</Panel>
				{/if}
			</div>
		{/if}
	</div>

	<PhotoViewer photos={partner.gallery.map((photo) => photo.large)} bind:index={openPhoto} />
{:else}
	<PartnersUnavailable />
{/if}

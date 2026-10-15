<script lang="ts">
	import Panel from '$lib/components/Panel.svelte';
	import SocialIcon, { platformName } from '$lib/components/partners/SocialIcon.svelte';
	import PartnersUnavailable from '$lib/components/partners/PartnersUnavailable.svelte';
	import PhotoViewer from '$lib/components/partners/PhotoViewer.svelte';
	import IconArrowLeft from '~icons/mdi/arrow-left';
	import IconText from '~icons/mdi/text-long';
	import IconImages from '~icons/mdi/image-multiple';

	let { data } = $props();

	/** The photo open full screen, if any. */
	let openPhoto = $state<number | null>(null);
</script>

<svelte:head>
	<title>Indy Center | {data.state === 'found' ? data.partner.name : 'Partners'}</title>
</svelte:head>

<a
	href="/partners"
	class="mb-4 inline-flex items-center gap-1 text-sm text-sky-400 hover:text-sky-300"
>
	<IconArrowLeft class="h-4 w-4" aria-hidden="true" />All partners
</a>

{#if data.state === 'found'}
	{@const partner = data.partner}
	<!-- The right column. Member perks will join the photos here. -->
	{@const hasSide = partner.gallery.length > 0}

	<div class="mb-8 overflow-hidden rounded-lg border border-slate-700/60 bg-slate-800/60">
		<div class="relative">
			{#if partner.banner}
				<img
					src={partner.banner.url}
					alt=""
					width={partner.banner.width}
					height={partner.banner.height}
					class="absolute inset-0 h-full w-full object-cover"
				/>
			{:else}
				<div
					class="absolute inset-0 bg-gradient-to-br from-sky-900 via-slate-800 to-slate-900"
				></div>
			{/if}
			<div
				class="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/40 to-transparent"
			></div>
			<div class="relative flex items-end gap-3 px-4 pt-32 pb-4 sm:gap-4 sm:px-6 sm:pt-40 lg:pt-48">
				<div class="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-900/80 sm:h-20 sm:w-20">
					<img
						src={partner.logo.url}
						alt=""
						width={partner.logo.width}
						height={partner.logo.height}
						class="h-full w-full object-contain p-1.5"
					/>
				</div>
				<div class="min-w-0">
					<div class="text-xs font-semibold tracking-widest text-sky-300 uppercase">
						{data.categoryName}
					</div>
					<h1 class="mt-1 text-2xl font-bold break-words text-white sm:text-3xl">
						{partner.name}
					</h1>
					<p class="mt-1 line-clamp-2 text-sm text-slate-300">{partner.tagline}</p>
				</div>
			</div>
		</div>

		<div
			class="flex flex-col gap-4 border-t border-slate-700/60 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
		>
			<div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
				{#each partner.callsToAction as cta, i (i)}
					<a
						href={cta.url}
						class="rounded-lg px-4 py-3 text-center text-sm font-semibold transition-colors {i === 0
							? 'bg-sky-600 text-white hover:bg-sky-500'
							: 'border border-slate-600 text-slate-200 hover:bg-slate-700'}">{cta.label}</a
					>
				{/each}
			</div>
			{#if partner.socialLinks.length}
				<div class="flex flex-wrap gap-2">
					{#each partner.socialLinks as link, i (i)}
						<a
							href={link.url}
							aria-label="{partner.name} on {platformName(link.platform)}"
							title={platformName(link.platform)}
							class="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-900/60 text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
						>
							<SocialIcon platform={link.platform} />
						</a>
					{/each}
				</div>
			{/if}
		</div>
	</div>

	<div class="grid gap-8 lg:grid-cols-3">
		<div class={hasSide ? 'lg:col-span-2' : 'lg:col-span-3'}>
			<Panel title="About" icon={IconText}>
				<div class="space-y-4 p-4 leading-relaxed text-slate-300 sm:p-6">
					{#each partner.paragraphs as paragraph, i (i)}
						<p>{paragraph}</p>
					{/each}
				</div>
			</Panel>
		</div>

		{#if hasSide}
			<div class="space-y-8">
				{#if partner.gallery.length}
					<Panel title="Photos" icon={IconImages}>
						{@const featured = partner.gallery[0].large}
						<div class="space-y-2 p-4">
							<button
								type="button"
								class="block w-full overflow-hidden rounded-md"
								aria-label="Open photo 1 of {partner.gallery.length}"
								onclick={() => (openPhoto = 0)}
							>
								<img
									src={featured.url}
									alt={featured.alt}
									width={featured.width}
									height={featured.height}
									class="aspect-[4/3] w-full object-cover"
								/>
							</button>
							{#if partner.gallery.length > 1}
								<div class="grid grid-cols-4 gap-2">
									{#each partner.gallery.slice(1) as photo, i (i)}
										<button
											type="button"
											class="overflow-hidden rounded-md"
											aria-label="Open photo {i + 2} of {partner.gallery.length}"
											onclick={() => (openPhoto = i + 1)}
										>
											<img
												src={photo.thumbnail.url}
												alt={photo.thumbnail.alt}
												width={photo.thumbnail.width}
												height={photo.thumbnail.height}
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

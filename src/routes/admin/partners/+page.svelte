<script lang="ts">
	import { goto } from '$app/navigation';
	import Badge from '$lib/components/Badge.svelte';
	import ImageWithFallback from '$lib/components/ui/ImageWithFallback.svelte';
	import { groupPartnersByCategory } from '$lib/config/partners';
	import IconHandshake from '~icons/mdi/handshake';
	import IconPlus from '~icons/mdi/plus';
	import IconOpenInNew from '~icons/mdi/open-in-new';

	let { data } = $props();

	const groups = $derived(groupPartnersByCategory(data.partners));
</script>

<svelte:head>
	<title>Partners - Admin - Indy Center</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between gap-4">
		<div>
			<h2 class="text-2xl font-semibold text-white">Partners</h2>
			<p class="mt-1 text-sm text-gray-400">
				Manage the partners shown on the public partners page
			</p>
		</div>
		<a
			href="/admin/partners/new"
			class="inline-flex shrink-0 items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:bg-sky-700"
		>
			<IconPlus class="h-4 w-4" />
			New Partner
		</a>
	</div>

	{#each groups as group (group.key)}
		<div class="overflow-hidden rounded-lg border border-slate-700/50 bg-slate-800/50">
			<div class="border-b border-slate-600/50 bg-slate-700/50 px-4 py-3">
				<h3 class="text-sm font-semibold tracking-wide text-white uppercase">{group.label}</h3>
			</div>
			<div class="overflow-x-auto">
				<table class="w-full">
					<tbody>
						{#each group.partners as partner (partner.id)}
							<tr
								class="cursor-pointer border-b border-slate-700/30 transition-colors duration-200 last:border-b-0 hover:bg-slate-700/30"
								onclick={() => goto(`/admin/partners/${partner.id}`)}
							>
								<td class="px-4 py-3">
									<div class="flex items-center gap-3">
										<ImageWithFallback
											src={partner.logoUrl}
											alt=""
											fallbackIcon={IconHandshake}
											class="h-10 w-10 shrink-0 rounded bg-slate-900/60 object-contain p-0.5"
										/>
										<div>
											<div class="text-sm font-medium text-white">{partner.name}</div>
											<div class="font-mono text-xs text-gray-400">/partners/{partner.slug}</div>
										</div>
									</div>
								</td>
								<td class="px-4 py-3">
									{#if partner.isPublished}
										<Badge size="sm" color="green" label="Published" />
									{:else}
										<Badge size="sm" color="gray" label="Draft" />
									{/if}
								</td>
								<td class="px-4 py-3 text-sm text-gray-400">
									{partner.links.length}
									{partner.links.length === 1 ? 'link' : 'links'}
								</td>
								<td class="px-4 py-3 text-sm text-gray-400">Order {partner.sortOrder}</td>
								<td class="px-4 py-3 text-right">
									<a
										href="/partners/{partner.slug}"
										onclick={(e) => e.stopPropagation()}
										title="View public page"
										class="inline-flex rounded p-1 text-gray-400 transition-colors hover:bg-slate-600/50 hover:text-sky-400"
									>
										<IconOpenInNew class="h-4 w-4" />
									</a>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{:else}
		<div
			class="rounded-lg border border-slate-700/50 bg-slate-800/50 px-4 py-12 text-center text-gray-400"
		>
			<IconHandshake class="mx-auto mb-3 h-10 w-10 text-slate-500" />
			No partners yet. Add the first one to get the partners page started.
		</div>
	{/each}
</div>

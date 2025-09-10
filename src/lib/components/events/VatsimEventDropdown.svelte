<script lang="ts">
	import { format } from 'date-fns';
	import { utc } from '@date-fns/utc';
	import { goto } from '$app/navigation';
	import IconChevronDown from '~icons/mdi/chevron-down';
	import IconGlobe from '~icons/mdi/earth';
	import IconDownload from '~icons/mdi/download-outline';
	import type { VatsimEvent } from '$lib/types/vatsim';

	const { vatsimEvents }: { vatsimEvents: VatsimEvent[] } = $props();

	let dropdownOpen = $state(false);

	function handleEventSelect(event: VatsimEvent) {
		// Navigate to create page with just the import ID
		goto(`/events/new?importId=${event.id}`);
		dropdownOpen = false;
	}

	function toggleDropdown() {
		dropdownOpen = !dropdownOpen;
	}

	// Close dropdown when clicking outside
	function handleClickOutside(event: MouseEvent) {
		const target = event.target as Element;
		if (!target.closest('[data-dropdown]')) {
			dropdownOpen = false;
		}
	}
</script>

<svelte:document on:click={handleClickOutside} />

{#if vatsimEvents.length > 0}
	<div class="relative" data-dropdown>
		<button
			type="button"
			onclick={toggleDropdown}
			class="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:bg-slate-600 hover:border-slate-500 focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-900 focus:outline-none"
		>
			<IconDownload class="h-4 w-4" />
			Import from VATSIM
			<IconChevronDown class="h-4 w-4 transition-transform {dropdownOpen ? 'rotate-180' : ''}" />
		</button>

		{#if dropdownOpen}
			<div class="absolute right-0 mt-2 w-96 rounded-lg border border-slate-600 bg-slate-800 shadow-xl backdrop-blur-sm z-50">
				<div class="p-2">
					<div class="mb-2 px-3 py-2">
						<h3 class="text-sm font-medium text-gray-300">Available VATSIM Events</h3>
						<p class="text-xs text-gray-400">Select an event to create with pre-filled data</p>
					</div>
					<div class="max-h-96 overflow-y-auto">
						{#each vatsimEvents as event}
							<button
								type="button"
								onclick={() => handleEventSelect(event)}
								class="w-full rounded-md border border-transparent p-3 text-left transition-colors hover:border-slate-600 hover:bg-slate-700/50"
							>
								<div class="flex gap-3">
									<!-- Banner Thumbnail -->
									{#if event.banner}
										<div class="h-16 w-24 flex-shrink-0 overflow-hidden rounded-md">
											<img
												src={event.banner}
												alt="{event.name} banner"
												class="h-full w-full object-cover"
												loading="lazy"
											/>
										</div>
									{:else}
										<div class="flex h-16 w-24 flex-shrink-0 items-center justify-center rounded-md bg-slate-700 text-gray-400">
											<IconGlobe class="h-6 w-6" />
										</div>
									{/if}

									<!-- Event Details -->
									<div class="min-w-0 flex-1">
										<h4 class="mb-1 text-sm font-medium text-white line-clamp-2">
											{event.name}
										</h4>
										
										{#if event.short_description}
											<p class="mb-2 text-xs text-gray-400 line-clamp-2">
												{event.short_description}
											</p>
										{/if}

										<!-- Event Metadata -->
										<div class="flex flex-wrap gap-1">
											<span class="inline-flex items-center rounded-md bg-sky-500/10 px-2 py-0.5 text-xs font-medium text-sky-300 border border-sky-500/20">
												{event.type}
											</span>
											{#if event.start_time}
												<span class="inline-flex items-center rounded-md bg-slate-600/50 px-2 py-0.5 text-xs font-medium text-slate-300">
													{format(utc(event.start_time), 'MMM d, HH:mm')}Z
												</span>
											{/if}
										</div>
									</div>
								</div>
							</button>
						{/each}
					</div>
				</div>
			</div>
		{/if}
	</div>
{/if}

<style>
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
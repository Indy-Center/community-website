<script lang="ts">
	import IconImport from '~icons/mdi/import';
	import IconChevronDown from '~icons/mdi/chevron-down';

	interface VatsimEvent {
		id: number;
		name: string;
		description?: string;
		start_time?: string;
		end_time?: string;
		banner?: string;
	}

	interface Props {
		events: VatsimEvent[];
		onSelect: (eventId: number) => void;
		buttonText?: string;
		disabled?: boolean;
	}

	let { events, onSelect, buttonText = 'Choose VATSIM Event', disabled = false }: Props = $props();

	let showDropdown = $state(false);

	let eventOptions = $derived(
		events.map((event) => ({
			id: event.id,
			name: event.name,
			description: event.description || '',
			start_time: event.start_time || '',
			end_time: event.end_time || '',
			banner: event.banner || ''
		}))
	);

	function selectEvent(eventId: number) {
		onSelect(eventId);
		showDropdown = false;
	}

	// Close dropdown when clicking outside
	function handleClickOutside(event: MouseEvent) {
		const target = event.target as Element;
		if (showDropdown && !target.closest('[data-dropdown]')) {
			showDropdown = false;
		}
	}
</script>

<svelte:window on:click={handleClickOutside} />

<div class="relative" data-dropdown>
	<button
		onclick={() => (showDropdown = !showDropdown)}
		{disabled}
		class="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:bg-sky-700 hover:shadow-xl focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-900 focus:outline-none"
	>
		<IconImport class="h-4 w-4" />
		{buttonText}
		<IconChevronDown class="h-4 w-4 transition-transform {showDropdown ? 'rotate-180' : ''}" />
	</button>

	{#if showDropdown}
		<div
			class="animate-in slide-in-from-top-2 absolute top-full left-0 z-50 mt-2 w-[32rem] rounded-lg border border-slate-700 bg-slate-900/95 shadow-xl backdrop-blur-sm duration-200"
		>
			<div class="border-b border-slate-700/50 p-4">
				<div class="flex items-center gap-2">
					<IconImport class="h-4 w-4 text-blue-400" />
					<p class="text-sm font-medium text-blue-300">Select a VATSIM event to import</p>
				</div>
			</div>
			<div class="max-h-80 overflow-y-auto">
				{#if eventOptions.length === 0}
					<div class="p-8 text-center">
						<div
							class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-800"
						>
							<IconImport class="h-5 w-5 text-gray-500" />
						</div>
						<div class="text-sm font-medium text-gray-400">No VATSIM events available</div>
						<p class="mt-1 text-xs text-gray-500">Check back later for upcoming events</p>
					</div>
				{:else}
					<div class="p-1">
						{#each eventOptions as event, i}
							<button
								type="button"
								onclick={() => selectEvent(event.id)}
								class="group relative w-full rounded-md p-3 text-left transition-all duration-150 hover:bg-slate-800/80 focus:bg-slate-800/80 focus:ring-2 focus:ring-sky-500/50 focus:outline-none focus:ring-inset"
							>
								<div class="flex items-start gap-3">
									<div class="min-w-0 flex-1">
										<div
											class="truncate text-sm font-medium text-white transition-colors group-hover:text-sky-300"
										>
											{event.name}
										</div>
										{#if event.description}
											<div class="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-400">
												{event.description}
											</div>
										{/if}
										{#if event.start_time}
											<div class="mt-3 flex flex-wrap items-center gap-2">
												<div
													class="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/20 px-2.5 py-1 text-xs font-medium text-blue-300"
												>
													<div class="h-1.5 w-1.5 rounded-full bg-blue-400"></div>
													{new Date(event.start_time).toLocaleDateString('en-US', {
														month: 'short',
														day: 'numeric',
														year: 'numeric'
													})}
												</div>
												<div
													class="rounded bg-slate-800/50 px-2 py-0.5 font-mono text-xs text-gray-500"
												>
													{new Date(event.start_time).toLocaleTimeString([], {
														hour: '2-digit',
														minute: '2-digit'
													})} UTC
												</div>
											</div>
										{/if}
									</div>
									<div class="mt-1 flex-shrink-0">
										<div
											class="flex h-8 w-8 items-center justify-center rounded-full border border-sky-500/20 bg-sky-500/10 transition-all group-hover:border-sky-500/40 group-hover:bg-sky-500/20"
										>
											<IconImport
												class="h-3.5 w-3.5 text-sky-400 transition-colors group-hover:text-sky-300"
											/>
										</div>
									</div>
								</div>
								{#if i < eventOptions.length - 1}
									<div class="absolute right-3 bottom-0 left-3 h-px bg-slate-700/30"></div>
								{/if}
							</button>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

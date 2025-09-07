<script lang="ts">
	import PageHero from '$lib/components/PageHero.svelte';
	import EventCard from '$lib/components/events/EventCard.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let selectedEvent = $state(null);
	let showModal = $state(false);

	function openEventModal(event) {
		selectedEvent = event;
		showModal = true;
	}

	function closeModal() {
		showModal = false;
		selectedEvent = null;
	}

	function handleModalClick(event) {
		event.stopPropagation();
	}

	function handleCloseClick(event) {
		event.preventDefault();
		event.stopPropagation();
		showModal = false;
		selectedEvent = null;
	}
</script>

<svelte:head>
	<title>Indy Center | Events</title>
	<meta name="description" content="Upcoming events at Indianapolis ARTCC - Join us for exciting aviation events, group flights, and ATC training opportunities." />
</svelte:head>

<div class="flex w-full flex-col justify-center gap-2">
	<PageHero size="compact">
		<h1 class="mb-1 text-xl font-bold text-white sm:text-lg md:text-lg lg:text-xl">
			Upcoming Events
		</h1>
		<p class="mx-auto mb-1 max-w-2xl text-xs leading-tight text-gray-300 sm:text-xs lg:text-sm">
			Join us for exciting aviation events, group flights, and ATC training opportunities.
		</p>
	</PageHero>

	<!-- Events Section -->
	<div class="w-full bg-gray-900">
		<div class="mx-auto max-w-6xl px-4 py-8">
			{#if data.events && data.events.length > 0}
				<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<!-- Featured Event (First Event) -->
					{#if data.events[0]}
						<div class="lg:col-span-2">
							<div class="mb-4">
								<h2 class="text-xl font-bold text-white mb-2">Next Event</h2>
								<div class="h-0.5 bg-gradient-to-r from-sky-500 to-blue-600 rounded-full"></div>
							</div>
							<div 
								class="bg-slate-800 rounded-xl border border-slate-600/50 overflow-hidden shadow-lg"
							>
								<!-- Featured Event Image -->
								<div class="relative h-48 sm:h-56">
									<div 
										class="w-full h-full bg-cover bg-center"
										style="background-image: url('{data.events[0].image}');"
									>
										<div class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
									</div>
									
									<!-- Event Badge -->
									<div class="absolute top-4 left-4">
										<span class="bg-sky-600/90 text-white px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm">
											{new Date(data.events[0].starts_at).toLocaleDateString([], {month: 'short', day: 'numeric'})}
										</span>
									</div>
								</div>
								
								<!-- Featured Event Content -->
								<div class="p-6">
									<h3 class="text-xl font-bold text-white mb-3">{data.events[0].name}</h3>
									<p class="text-gray-300 text-sm leading-relaxed mb-4">{data.events[0].description}</p>
									
									<!-- Featured Event Time -->
									<div class="flex flex-col sm:flex-row gap-4 text-sm bg-slate-700/30 rounded-lg p-3">
										<div class="flex items-center gap-2">
											<span class="text-sky-400 font-medium">
												{new Date(data.events[0].starts_at).toLocaleDateString([], {weekday: 'long', month: 'long', day: 'numeric'})}
											</span>
										</div>
										<div class="flex flex-col sm:flex-row gap-2 text-gray-400">
											<span>UTC: {new Date(data.events[0].starts_at).toISOString().slice(11, 16)}Z - {new Date(data.events[0].ends_at).toISOString().slice(11, 16)}Z</span>
											<span class="hidden sm:inline">•</span>
											<span>Local: {new Date(data.events[0].starts_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(data.events[0].ends_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
										</div>
									</div>
								</div>
							</div>
						</div>
					{/if}
					
					<!-- Upcoming Events List (Next 4) -->
					{#if data.events.length > 1}
						<div class="lg:col-span-1">
							<div class="mb-4">
								<h2 class="text-xl font-bold text-white mb-2">Upcoming Events</h2>
								<div class="h-0.5 bg-gradient-to-r from-sky-500 to-blue-600 rounded-full"></div>
							</div>
							<div class="space-y-3">
								{#each data.events.slice(1) as event}
									<!-- Compact Event Item -->
									<div 
										onclick={() => openEventModal(event)} 
										class="bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-600/50 hover:border-sky-500/30 transition-all duration-200 cursor-pointer overflow-hidden"
									>
										<div class="flex">
											<!-- Compact Event Image -->
											<div class="w-16 h-16 relative flex-shrink-0">
												<div 
													class="w-full h-full bg-cover bg-center"
													style="background-image: url('{event.image}');"
												>
													<div class="absolute inset-0 bg-gradient-to-br from-blue-600/60 to-sky-500/40"></div>
													<div class="absolute inset-0 bg-black/30"></div>
												</div>
											</div>
											
											<!-- Compact Event Content -->
											<div class="flex-1 p-3">
												<h4 class="text-sm font-semibold text-white mb-1 line-clamp-1">{event.name}</h4>
												<p class="text-gray-400 text-xs mb-2 line-clamp-1">{event.description}</p>
												
												<!-- Compact Date and Time -->
												<div class="flex flex-col gap-1 text-xs">
													<span class="text-sky-400 font-medium">
														{new Date(event.starts_at).toLocaleDateString([], {month: 'short', day: 'numeric'})}
													</span>
													<span class="text-gray-500">
														{new Date(event.starts_at).toISOString().slice(11, 16)}Z
													</span>
												</div>
											</div>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			{:else}
				<div class="text-center py-12">
					<div class="text-gray-400 text-lg mb-2">No upcoming events scheduled</div>
					<p class="text-gray-500 text-sm">
						Check back soon for exciting aviation events and training opportunities.
					</p>
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- Event Detail Modal -->
{#if showModal && selectedEvent}
	<div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onclick={closeModal}>
		<div class="bg-slate-800 rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden" onclick={handleModalClick}>
			<!-- Modal Header with Banner -->
			<div 
				class="relative h-32 sm:h-40 bg-cover bg-center"
				style="background-image: url('{selectedEvent.image}');"
			>
				<div class="absolute inset-0 bg-gradient-to-br from-blue-600/80 to-sky-500/60"></div>
				<div class="absolute inset-0 bg-black/40"></div>
				
				<!-- Close button -->
				<button 
					type="button"
					class="absolute top-2 right-2 sm:top-3 sm:right-3 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors duration-200 cursor-pointer z-10"
					onclick={() => { showModal = false; selectedEvent = null; }}
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
					</svg>
				</button>
				
				<div class="relative p-3 sm:p-4 h-full flex flex-col justify-end">
					<h2 class="text-lg sm:text-xl font-bold text-white mb-1">{selectedEvent.name}</h2>
					<div class="text-sky-200 text-xs sm:text-sm">
						{new Date(selectedEvent.starts_at).toLocaleDateString([], {weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'})}
					</div>
				</div>
			</div>

			<!-- Modal Content -->
			<div class="p-4 overflow-y-auto max-h-[calc(90vh-8rem)] sm:max-h-[calc(90vh-10rem)]">
				<!-- Description -->
				<div class="mb-4">
					<p class="text-gray-300 text-sm leading-relaxed">{selectedEvent.description}</p>
				</div>

				<!-- Time Information -->
				<div class="bg-slate-700/50 rounded-lg p-3 mb-4">
					<div class="space-y-1 text-sm text-gray-300">
						<div><span class="text-gray-400">UTC:</span> {new Date(selectedEvent.starts_at).toISOString().slice(11, 16)}Z - {new Date(selectedEvent.ends_at).toISOString().slice(11, 16)}Z</div>
						<div><span class="text-gray-400">Local:</span> {new Date(selectedEvent.starts_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(selectedEvent.ends_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
					</div>
				</div>

				<!-- Action Button -->
				{#if selectedEvent.link}
					<a 
						href={selectedEvent.link} 
						target="_blank" 
						class="w-full block bg-sky-600 hover:bg-sky-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors duration-200 text-center text-sm cursor-pointer"
					>
						View Full Event Details
					</a>
				{/if}
			</div>
		</div>
	</div>
{/if}
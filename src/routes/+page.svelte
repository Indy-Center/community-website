<script lang="ts">
	import EventCard from '$lib/components/events/EventListCard.svelte';
	import WeatherPanel from '$lib/components/status/WeatherPanel.svelte';
	import ControllersPanel from '$lib/components/status/ControllersPanel.svelte';
	import PageHero from '$lib/components/PageHero.svelte';
	import IconDiscord from '~icons/mdi/discord';

	let { data } = $props();
</script>

<svelte:head>
	<title>Indy Center | Welcome to Indy</title>
</svelte:head>

<div class="flex w-full flex-col justify-center gap-2">
	<PageHero>
		<h2 class="mb-3 text-4xl font-bold text-white sm:text-2xl md:text-xl lg:text-3xl">
			Welcome to Indy Center
		</h2>
		<p class="mx-auto mb-4 max-w-4xl text-sm leading-relaxed text-gray-300 sm:text-base">
			An integrated pilot and controller community on the VATSIM network. We simulate immersive
			aviation operations within Indy Center's 73,000 square miles of airspace across Indiana,
			Illinois, Kentucky, Ohio, West Virginia, Virginia, and Tennessee. Join for events, learn to
			control, participate in group flights, or chat with fellow flight sim enthusiasts.
		</p>
		<div class="mx-auto flex flex-col justify-center gap-2 sm:max-w-none sm:flex-row sm:gap-4">
			<a
				href="https://discord.indy.center"
				target="_blank"
				class="flex items-center justify-center space-x-2 rounded bg-indigo-600 px-4 py-2 font-bold text-white shadow-lg hover:bg-indigo-700 transition-colors duration-200"
			>
				<IconDiscord class="h-4 w-4" />
				<span>Get Connected on Discord</span>
			</a>
		</div>
	</PageHero>
	<!-- Events Section -->
	<div class="w-full overflow-hidden bg-gray-900">
		<div class="mx-auto flex max-w-6xl flex-col items-center justify-center gap-2 md:flex-row">
			{#each data.events as event}
				<div class="w-full min-w-0 md:max-w-md md:flex-1">
					<EventCard {event} />
				</div>
			{/each}
		</div>
	</div>

	<!-- Status Section -->
	<div class="w-full bg-gray-900">
		<div class="mx-auto flex w-full max-w-6xl flex-col gap-2 md:flex-row">
			<div class="flex-1">
				<WeatherPanel metars={data.metars} />
			</div>

			<div class="flex-1">
				<ControllersPanel controllers={data.controllers} />
			</div>
		</div>
	</div>
</div>

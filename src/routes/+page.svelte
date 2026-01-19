<script lang="ts">
	import EventGridCard from '$lib/components/events/EventGridCard.svelte';
	import WeatherPanel from '$lib/components/status/WeatherPanel.svelte';
	import ControllersPanel from '$lib/components/status/ControllersPanel.svelte';
	import Panel from '$lib/components/Panel.svelte';
	import PageHero from '$lib/components/PageHero.svelte';
	import DynamicMembershipButton from '$lib/components/DynamicMembershipButton.svelte';
	import IconDiscord from '~icons/mdi/discord';
	import IconVisit from '~icons/mdi/sign-direction-plus';
	import IconCalendar from '~icons/mdi/calendar-clock';

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
				class="flex items-center justify-center space-x-2 rounded bg-indigo-600 px-4 py-2 font-bold text-white shadow-lg transition-colors duration-200 hover:bg-indigo-700"
			>
				<IconDiscord class="h-4 w-4" />
				<span>Get Connected on Discord</span>
			</a>
			<DynamicMembershipButton user={data.user} class="shadow-lg" />
		</div>
	</PageHero>
	<!-- Main Content Section -->
	<div class="w-full bg-gray-900 py-4">
		<div class="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4">
			<!-- Events Section - Full Width -->
			{#if data.events.length > 0}
				<Panel title="Upcoming Events" icon={IconCalendar}>
					<div class="p-4">
						<div class="mx-auto grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
							{#each data.events.slice(0, 3) as event}
								<EventGridCard {event} />
							{/each}
						</div>
					</div>
					<div class="border-t border-slate-700/60 px-4 py-3">
						<a
							href="/events"
							class="inline-flex items-center text-xs font-medium text-sky-400 transition-colors hover:text-sky-300"
						>
							View All Events →
						</a>
					</div>
				</Panel>
			{/if}

			<!-- Status Section - Two Columns -->
			<div class="flex w-full flex-col gap-4 md:flex-row">
				<div class="w-full md:w-3/5">
					<WeatherPanel metars={data.metars} />
				</div>

				<div class="w-full md:w-2/5">
					<ControllersPanel controllers={data.controllers} />
				</div>
			</div>
		</div>
	</div>
</div>

<script lang="ts">
	import { Button, Icon, Link, PageHero, Panel, Text } from '@indy-center/centerline-svelte';
	import { mdiCalendarClock } from '@mdi/js';
	import { brandDiscord } from '$lib/brandIcons';
	import EventGridCard from '$lib/components/events/EventGridCard.svelte';
	import WeatherPanel from '$lib/components/status/WeatherPanel.svelte';
	import UpcomingBookings from '$lib/components/status/UpcomingBookings.svelte';
	import ControllersPanel from '$lib/components/status/ControllersPanel.svelte';
	import DynamicMembershipButton from '$lib/components/DynamicMembershipButton.svelte';
	import {
		DISCORD_INVITE_URL,
		joinDiscordHref,
		type DiscordStep
	} from '$lib/profile/linkedAccounts';

	let { data } = $props();
</script>

{#snippet discordButton(step: DiscordStep)}
	{@const open = step === 'open'}
	<!-- Join leaves the site for sign-in and Discord, so it's a full page load -->
	<Button
		variant="secondary"
		size="lg"
		href={open ? DISCORD_INVITE_URL : joinDiscordHref('/')}
		target={open ? '_blank' : undefined}
		rel={open ? 'noopener noreferrer' : undefined}
		data-sveltekit-reload={open ? undefined : ''}
	>
		<Icon path={brandDiscord} />
		{step === 'sign-in'
			? 'Sign in to join Discord'
			: step === 'join'
				? 'Join Discord'
				: 'Open Discord (new tab)'}
	</Button>
{/snippet}

<svelte:head>
	<title>Indy Center</title>
</svelte:head>

<PageHero title="Welcome to Indy Center">
	<Text lead class="mx-auto max-w-4xl">
		An integrated pilot and controller community on the VATSIM network. We simulate immersive
		aviation operations within Indy Center's 73,000 square miles of airspace across Indiana,
		Illinois, Kentucky, Ohio, West Virginia, Virginia, and Tennessee. Join for events, learn to
		control, participate in group flights, or chat with fellow flight sim enthusiasts.
	</Text>
	<div class="mt-6 flex flex-col justify-center gap-2 sm:flex-row sm:gap-4">
		<DynamicMembershipButton user={data.user} />
		<!-- Until larry answers, a signed-in member is offered Join, which also works if they're in -->
		{#await data.discord}
			{@render discordButton(data.user ? 'join' : 'sign-in')}
		{:then step}
			{@render discordButton(step)}
		{/await}
	</div>
</PageHero>

<div class="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8">
	{#if data.events.length > 0}
		<Panel title="Upcoming events" level={2}>
			{#snippet icon()}<Icon path={mdiCalendarClock} />{/snippet}
			<ul class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
				{#each data.events.slice(0, 3) as event (event.id)}
					<li><EventGridCard {event} /></li>
				{/each}
			</ul>
			<p class="mt-4 text-sm"><Link href="/events">All events</Link></p>
		</Panel>
	{/if}

	<!-- Bookings starting within the reminder window -->
	{#if data.upcomingBookings.length > 0}
		<UpcomingBookings bookings={data.upcomingBookings} />
	{/if}

	<div class="flex w-full flex-col items-start gap-4 md:flex-row">
		<div class="w-full md:w-3/5">
			<WeatherPanel metars={data.metars} />
		</div>
		<div class="w-full md:w-2/5">
			<ControllersPanel controllers={data.controllers} />
		</div>
	</div>
</div>

<script lang="ts">
	import { page } from '$app/state';
	import { Button, Card, Heading, Icon, PageHeader } from '@indy-center/centerline-svelte';
	import { mdiHeadset, mdiLockOutline } from '@mdi/js';
	import { brandDiscord } from '$lib/brandIcons';
	import { FACILITY_ID } from '$lib/config';
	import {
		DISCORD_INVITE_URL,
		joinDiscordHref,
		TEAMSPEAK_CONNECT_URL
	} from '$lib/profile/linkedAccounts';
	import { signInHref } from '$lib/utils/signIn';

	let { data } = $props();
	const { discord, teamspeak } = $derived(data.steps);
</script>

<svelte:head>
	<title>Socials | Indy Center</title>
</svelte:head>

<PageHeader title="Socials" class="mb-8">
	Talk to other pilots and controllers on our Discord, and TeamSpeak.
</PageHeader>

<div class="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
	<Card as="section">
		<div class="flex h-full flex-col gap-4">
			<div class="flex items-center gap-3">
				<Icon path={brandDiscord} size={32} class="shrink-0 text-muted-foreground" />
				<Heading level={2} look={3}>Discord</Heading>
			</div>
			<p class="text-muted-foreground">
				Join the conversations, keep track of community events, and share screenshots.
			</p>
			<div class="mt-auto flex flex-col items-start gap-3">
				{#if discord === 'sign-in'}
					<p class="flex items-center gap-2 text-sm text-muted-foreground">
						<Icon path={mdiLockOutline} class="shrink-0" /> Sign in with VATSIM to join.
					</p>
					<!-- A full page load: it leaves the site for sign-in, then Discord -->
					<Button href={joinDiscordHref(page.url.pathname)} data-sveltekit-reload
						>Sign in to join</Button
					>
				{:else if discord === 'join'}
					<p class="text-sm text-muted-foreground">
						Link your Discord account and join the server.
					</p>
					<Button href={joinDiscordHref(page.url.pathname)} data-sveltekit-reload
						>Join Discord</Button
					>
				{:else}
					<p class="text-sm text-muted-foreground">You're in the Indy Center Discord.</p>
					<Button
						href={DISCORD_INVITE_URL}
						variant="secondary"
						target="_blank"
						rel="noopener noreferrer">Open Discord (new tab)</Button
					>
				{/if}
			</div>
		</div>
	</Card>

	<Card as="section">
		<div class="flex h-full flex-col gap-4">
			<div class="flex items-center gap-3">
				<Icon path={mdiHeadset} size={32} class="shrink-0 text-muted-foreground" />
				<Heading level={2} look={3}>TeamSpeak</Heading>
			</div>
			<p class="text-muted-foreground">
				Voice chat for controller coordination, group flights, and other games.
			</p>
			<div class="mt-auto flex flex-col items-start gap-3">
				{#if teamspeak === 'sign-in'}
					<p class="flex items-center gap-2 text-sm text-muted-foreground">
						<Icon path={mdiLockOutline} class="shrink-0" /> Sign in to see how to connect.
					</p>
					<Button href={signInHref(page.url.pathname)}>Sign in</Button>
				{:else}
					<p class="text-sm text-muted-foreground">
						Server address: <strong class="font-mono text-foreground">{FACILITY_ID}</strong>.
						{teamspeak === 'linked'
							? 'Linked to your account.'
							: "We'll message you a link to connect your account."}
					</p>
					<Button href={TEAMSPEAK_CONNECT_URL} target="_blank" rel="noopener noreferrer"
						>Connect to TeamSpeak (new tab)</Button
					>
				{/if}
			</div>
		</div>
	</Card>
</div>

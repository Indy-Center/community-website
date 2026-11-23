<script lang="ts">
	import { page } from '$app/state';
	import { Button, Card, PageHeader } from '@indy-center/centerline-svelte';
	import { FACILITY_ID } from '$lib/config';
	import {
		DISCORD_INVITE_URL,
		joinDiscordHref,
		TEAMSPEAK_CONNECT_URL
	} from '$lib/profile/linkedAccounts';
	import { signInHref } from '$lib/utils/signIn';
	import IconDiscord from '~icons/mdi/discord';
	import IconTeamSpeak from '~icons/mdi/headset';
	import IconLock from '~icons/mdi/lock-outline';

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
				<IconDiscord class="h-8 w-8 shrink-0 text-[#5865F2]" aria-hidden="true" />
				<h2 class="text-xl font-semibold text-foreground">Discord</h2>
			</div>
			<p class="text-muted-foreground">
				Join the conversations, keep track of community events, and share screenshots.
			</p>
			<div class="mt-auto flex flex-col items-start gap-3">
				{#if discord === 'sign-in'}
					<p class="flex items-center gap-2 text-sm text-muted-foreground">
						<IconLock class="h-4 w-4 shrink-0" aria-hidden="true" /> Sign in with VATSIM to join.
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
						rel="noopener noreferrer">Open Discord</Button
					>
				{/if}
			</div>
		</div>
	</Card>

	<Card as="section">
		<div class="flex h-full flex-col gap-4">
			<div class="flex items-center gap-3">
				<IconTeamSpeak class="h-8 w-8 shrink-0 text-muted-foreground" aria-hidden="true" />
				<h2 class="text-xl font-semibold text-foreground">TeamSpeak</h2>
			</div>
			<p class="text-muted-foreground">
				Voice chat for controller coordination, group flights, and other games.
			</p>
			<div class="mt-auto flex flex-col items-start gap-3">
				{#if teamspeak === 'sign-in'}
					<p class="flex items-center gap-2 text-sm text-muted-foreground">
						<IconLock class="h-4 w-4 shrink-0" aria-hidden="true" /> Sign in to see how to connect.
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
						>Connect to TeamSpeak</Button
					>
				{/if}
			</div>
		</div>
	</Card>
</div>

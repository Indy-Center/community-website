<script lang="ts">
	// The body of the profile's "Linked accounts" panel, beside both modes. Its controls act on
	// their own, never as part of the edit form: Link Discord goes to Discord's sign-in, and
	// Unlink and Sync my roles post their own actions, each coming back to /profile with its
	// message as a toast. `discord` is the row the load worked out from larry's `getLinks`, or
	// null when larry can't be asked.
	import { enhance } from '$app/forms';
	import { Alert, Button, Icon } from '@indy-center/centerline-svelte';
	import { mdiHeadset, mdiSync } from '@mdi/js';
	import { brandDiscord } from '$lib/brandIcons';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { FACILITY_ID } from '$lib/config';
	import {
		LINKS_UNAVAILABLE,
		TEAMSPEAK_CONNECT_URL,
		type DiscordRow,
		type TeamSpeakRow
	} from '$lib/profile/linkedAccounts';

	let {
		discord,
		teamspeak = null
	}: {
		discord: DiscordRow | null;
		teamspeak?: TeamSpeakRow | null;
	} = $props();

	let unlinking = $state(false);
	let unlinkingTs = $state(false);
	let syncing = $state(false);

	// Marks a button busy until its action's redirect has loaded the page again
	const busyWhile =
		(set: (busy: boolean) => void): SubmitFunction =>
		() => {
			set(true);
			return async ({ update }) => {
				await update();
				set(false);
			};
		};
</script>

{#if !discord}
	<Alert level="caution">{LINKS_UNAVAILABLE}</Alert>
{:else}
	<!-- Each row: the icon and heading on the left, its one button at the right on the same line,
	     at every width; the account's text under both, across the whole panel -->
	<ul class="divide-y divide-border">
		<li class="py-4 first:pt-0">
			<div class="flex items-center justify-between gap-3">
				<div class="flex min-w-0 items-center gap-3">
					<Icon path={brandDiscord} size={20} class="shrink-0 text-muted-foreground" />
					<p class="font-medium text-foreground">Discord</p>
				</div>
				<div class="shrink-0">
					{#if discord.state === 'linked' && !discord.outsideServer}
						<form method="POST" action="?/unlink" use:enhance={busyWhile((b) => (unlinking = b))}>
							<Button
								type="submit"
								variant="secondary"
								size="sm"
								busy={unlinking}
								busyLabel="Unlinking">Unlink</Button
							>
						</form>
					{:else if discord.state !== 'none' && discord.outsideServer}
						<!-- Link Discord again: it links the account they choose and adds them to the server -->
						<Button size="sm" href="/profile/discord" data-sveltekit-reload>Join Discord</Button>
					{:else}
						<!-- A full page load: it leaves the site for Discord's sign-in -->
						<Button variant="secondary" size="sm" href="/profile/discord" data-sveltekit-reload>
							{discord.state === 'vatusa' ? 'Use a different account' : 'Link Discord'}
						</Button>
					{/if}
				</div>
			</div>
			<div class="mt-2 text-sm text-muted-foreground">
				{#if discord.state === 'linked'}
					<p>Linked: <span class="font-mono break-all">{discord.account}</span></p>
					{#if discord.outsideServer}
						<p>Not in the Indy Center Discord.</p>
					{/if}
				{:else if discord.state === 'vatusa'}
					<p>
						{discord.outsideServer
							? 'Linked on VATUSA, but not in the Indy Center Discord.'
							: 'Linked on VATUSA'}
					</p>
				{:else}
					<p>No Discord account</p>
				{/if}
			</div>
		</li>
		{#if teamspeak}
			<li class="py-4">
				<div class="flex items-center justify-between gap-3">
					<div class="flex min-w-0 items-center gap-3">
						<Icon path={mdiHeadset} size={20} class="shrink-0 text-muted-foreground" />
						<p class="font-medium text-foreground">TeamSpeak</p>
					</div>
					<div class="shrink-0">
						{#if teamspeak.state === 'linked'}
							<form
								method="POST"
								action="?/unlink"
								use:enhance={busyWhile((b) => (unlinkingTs = b))}
							>
								<input type="hidden" name="service" value="teamspeak" />
								<Button
									type="submit"
									variant="secondary"
									size="sm"
									busy={unlinkingTs}
									busyLabel="Unlinking">Unlink</Button
								>
							</form>
						{:else}
							<Button
								variant="secondary"
								size="sm"
								href={TEAMSPEAK_CONNECT_URL}
								target="_blank"
								rel="noopener noreferrer">Connect to TeamSpeak</Button
							>
						{/if}
					</div>
				</div>
				<div class="mt-2 space-y-1 text-sm text-muted-foreground">
					{#if teamspeak.state === 'linked'}
						<p>Linked: <span class="font-mono break-all">{teamspeak.uid}</span></p>
					{:else}
						<p>Connect to our TeamSpeak and we'll send you a private message with your link.</p>
						<p>
							Or type <strong class="font-mono text-foreground">{FACILITY_ID}</strong> in TeamSpeak's
							server address box.
						</p>
					{/if}
				</div>
			</li>
		{/if}
	</ul>

	<form
		method="POST"
		action="?/syncRoles"
		use:enhance={busyWhile((b) => (syncing = b))}
		class="flex items-center justify-between gap-3 border-t border-border pt-4"
	>
		<div class="flex min-w-0 items-center gap-3">
			<Icon path={mdiSync} size={20} class="shrink-0 text-muted-foreground" />
			<p class="font-medium text-foreground">Sync Roles</p>
		</div>
		<div class="shrink-0">
			<Button type="submit" variant="secondary" size="sm" busy={syncing} busyLabel="Syncing"
				>Sync my roles</Button
			>
		</div>
	</form>
{/if}

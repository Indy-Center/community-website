<script lang="ts">
	// The body of the profile's "Linked accounts" panel, beside both modes. Its controls act on
	// their own, never as part of the edit form: Link Discord goes to Discord's sign-in, and
	// Unlink and Sync my roles post their own actions, each coming back to /profile with its
	// message. `discord` is the row the load worked out from larry's `getLinks`, or null when
	// larry can't be asked.
	import { enhance } from '$app/forms';
	import { Alert, Button, CopyButton } from '@indy-center/centerline-svelte';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { FACILITY_ID } from '$lib/config';
	import {
		LINKS_UNAVAILABLE,
		TEAMSPEAK_CONNECT_URL,
		type AccountsFlash,
		type DiscordRow,
		type TeamSpeakRow
	} from '$lib/profile/linkedAccounts';
	import IconDiscord from '~icons/mdi/discord';
	import IconTeamSpeak from '~icons/mdi/headset';

	let {
		discord,
		teamspeak = null,
		message
	}: {
		discord: DiscordRow | null;
		teamspeak?: TeamSpeakRow | null;
		message: Pick<AccountsFlash, 'level' | 'message'> | null;
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

{#if message}
	<Alert level={message.level} class="mb-4">{message.message}</Alert>
{/if}

{#if !discord}
	<Alert level="caution">{LINKS_UNAVAILABLE}</Alert>
{:else}
	<ul class="divide-y divide-border">
		<li class="flex flex-wrap items-center justify-between gap-4 py-4 first:pt-0">
			<div class="flex items-start gap-3">
				<IconDiscord class="mt-0.5 h-5 w-5 text-[#5865F2]" aria-hidden="true" />
				<div>
					<p class="font-medium text-foreground">Discord</p>
					{#if discord.state === 'linked'}
						<p class="text-sm text-muted-foreground">
							Linked: <span class="font-mono break-all">{discord.account}</span>
						</p>
					{:else if discord.state === 'vatusa'}
						<p class="text-sm text-muted-foreground">
							Using the Discord account you linked on VATUSA
						</p>
					{:else}
						<p class="text-sm text-muted-foreground">No Discord account</p>
					{/if}
				</div>
			</div>
			{#if discord.state === 'linked'}
				<form method="POST" action="?/unlink" use:enhance={busyWhile((b) => (unlinking = b))}>
					<Button type="submit" variant="secondary" size="sm" busy={unlinking} busyLabel="Unlinking"
						>Unlink</Button
					>
				</form>
			{:else}
				<!-- A full page load: it leaves the site for Discord's sign-in -->
				<Button variant="secondary" size="sm" href="/profile/discord" data-sveltekit-reload>
					{discord.state === 'vatusa' ? 'Use a different account' : 'Link Discord'}
				</Button>
			{/if}
			{#if discord.state === 'none'}
				<p class="w-full text-sm text-muted-foreground">
					We'll add you to the Indy Center Discord if you're not already in it.
				</p>
			{/if}
		</li>
		{#if teamspeak}
			<li class="flex flex-wrap items-center justify-between gap-4 py-4">
				<div class="flex items-start gap-3">
					<IconTeamSpeak class="mt-0.5 h-5 w-5 text-muted-foreground" aria-hidden="true" />
					<div>
						<p class="font-medium text-foreground">TeamSpeak</p>
						{#if teamspeak.state === 'linked'}
							<p class="text-sm text-muted-foreground">
								Linked: <span class="font-mono break-all">{teamspeak.uid}</span>
							</p>
						{:else}
							<p class="text-sm text-muted-foreground">
								Connect to our TeamSpeak and we'll send you a private message with your link.
							</p>
						{/if}
					</div>
				</div>
				{#if teamspeak.state === 'linked'}
					<form method="POST" action="?/unlink" use:enhance={busyWhile((b) => (unlinkingTs = b))}>
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
					<div class="flex w-full flex-col items-start gap-2">
						<Button
							variant="secondary"
							size="sm"
							href={TEAMSPEAK_CONNECT_URL}
							target="_blank"
							rel="noopener noreferrer">Connect to TeamSpeak</Button
						>
						<p class="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
							or type <strong class="font-mono text-foreground">{FACILITY_ID}</strong> in
							TeamSpeak's server address box
							<CopyButton text={FACILITY_ID} label="server address" />
						</p>
					</div>
				{/if}
			</li>
		{/if}
	</ul>

	<form
		method="POST"
		action="?/syncRoles"
		use:enhance={busyWhile((b) => (syncing = b))}
		class="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4"
	>
		<p class="text-sm text-muted-foreground">
			Your roles sync on their own. Sync now if something looks out of date.
		</p>
		<Button type="submit" variant="secondary" size="sm" busy={syncing} busyLabel="Syncing"
			>Sync my roles</Button
		>
	</form>
{/if}

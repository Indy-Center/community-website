<script lang="ts">
	// "How others see you": the name choice as it stands in the form, drawn as the user menu,
	// roster, profile and Discord would show it.
	import { Member } from '@indy-center/centerline-svelte';
	import { memberName } from '$lib/members';
	import { preferredNameFor, type NameChoice, type VatsimName } from '$lib/profile/nameChoice';

	let {
		vatsimName,
		hasNamePrivacy,
		choice,
		customName,
		pronouns,
		hasDiscord
	}: {
		vatsimName: VatsimName;
		hasNamePrivacy: boolean;
		choice: NameChoice;
		customName: string;
		pronouns: string;
		/** A Discord account linked, or known from VATUSA. */
		hasDiscord: boolean;
	} = $props();

	// The same rule every page uses, so the preview can't disagree with them
	const name = $derived(
		memberName({
			...vatsimName,
			preferredName: preferredNameFor(vatsimName, choice, customName, hasNamePrivacy) || null,
			namePrivacy: hasNamePrivacy
		})
	);
</script>

<div class="rounded-lg border border-border bg-muted/40 p-4">
	<p class="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
		How others see you
	</p>
	<dl class="grid grid-cols-1 gap-y-1 text-sm [&_dd]:mb-2 [&_dd]:min-w-0">
		<!-- The header's user menu shows the name above the CID -->
		<dt class="text-muted-foreground">Your user menu</dt>
		<dd class="font-semibold text-foreground">{name}</dd>

		<dt class="text-muted-foreground">Roster, events</dt>
		<dd>
			<Member {name} cid={vatsimName.cid} showCid={choice !== 'cid'} />
		</dd>

		<!-- Pronouns show only here, in the profile's header (ProfileHeader) -->
		<dt class="text-muted-foreground">Your profile</dt>
		<dd class="font-semibold text-foreground">
			{name}{#if pronouns.trim()}
				<span class="font-normal text-muted-foreground">({pronouns.trim()})</span>{/if}
		</dd>

		{#if hasDiscord}
			<dt class="text-muted-foreground">Discord nickname</dt>
			<dd class="font-mono">{name}</dd>
		{/if}
	</dl>
</div>

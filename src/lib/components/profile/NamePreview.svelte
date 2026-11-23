<script lang="ts">
	// "How others see you": the name choice as it stands in the form, drawn as the site's header,
	// roster, profile and Discord would show it.
	import { Member } from '@indy-center/centerline-svelte';
	import MembershipBadge from '$lib/components/MembershipBadge.svelte';
	import { memberName } from '$lib/members';
	import { preferredNameFor, type NameChoice, type VatsimName } from '$lib/profile/nameChoice';
	import IconChevronDown from '~icons/mdi/chevron-down';

	let {
		vatsimName,
		hasNamePrivacy,
		choice,
		customName,
		pronouns,
		membership,
		hasDiscord
	}: {
		vatsimName: VatsimName;
		hasNamePrivacy: boolean;
		choice: NameChoice;
		customName: string;
		pronouns: string;
		membership: 'basic' | 'community' | 'controller';
		/** A Discord account linked, or known from VATUSA. */
		hasDiscord: boolean;
	} = $props();

	// The same rule every page uses, so the preview can't disagree with them
	const name = $derived(
		memberName({
			...vatsimName,
			preferredName: preferredNameFor(vatsimName, choice, customName) || null,
			namePrivacy: hasNamePrivacy
		})
	);
</script>

<div class="rounded-lg border border-border bg-muted/40 p-4">
	<p class="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
		How others see you
	</p>
	<dl class="grid grid-cols-1 gap-y-1 text-sm [&_dd]:mb-2 [&_dd]:min-w-0">
		<dt class="text-muted-foreground">Site header</dt>
		<dd>
			<!-- A copy of the header's user chip (UserProfileDropdown) -->
			<span
				class="inline-flex items-center space-x-3 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-gray-300"
			>
				<MembershipBadge size="sm" {membership} />
				<span class="font-medium">{name}</span>
				<IconChevronDown class="h-4 w-4" aria-hidden="true" />
			</span>
		</dd>

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

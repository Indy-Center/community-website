<script lang="ts">
	import { Chip, Credential, Heading, Rating } from '@indy-center/centerline-svelte';
	import MembershipBadge from '$lib/components/MembershipBadge.svelte';
	import StaffBadges from '$lib/components/StaffBadges.svelte';
	import type { StaffBadgeKey } from '$lib/config/staffBadges';
	import { credentialName, type AvailableCredential } from '$lib/credentials';

	let {
		name,
		pronouns,
		cid,
		membership,
		operatingInitials,
		atcRating,
		pilotRating,
		staffBadges = [],
		certifications = [],
		endorsements = [],
		credentials = []
	}: {
		name: string;
		pronouns: string | null;
		cid: string;
		membership: 'basic' | 'community' | 'controller';
		operatingInitials: string | null;
		atcRating: string | null;
		pilotRating: string | null;
		staffBadges?: StaffBadgeKey[];
		certifications?: string[];
		endorsements?: string[];
		/** The available credentials, to give each chip its full name. */
		credentials?: Pick<AvailableCredential, 'code' | 'name'>[];
	} = $props();
</script>

<!-- The profile's h1: the member's name, then their badges -->
<div class="flex flex-col gap-2">
	<Heading level={1} class="flex flex-wrap items-baseline gap-x-3">
		{name}
		{#if pronouns}
			<span class="text-base font-normal text-muted-foreground">({pronouns})</span>
		{/if}
	</Heading>
	<div class="flex flex-wrap items-center gap-2 text-sm">
		<MembershipBadge {membership} size="sm" />
		<span class="font-mono text-muted-foreground">CID {cid}</span>
		{#if operatingInitials}
			<Chip variant="initials">{operatingInitials}</Chip>
		{/if}
		{#if atcRating}
			<Rating rating={atcRating} />
		{/if}
		{#if pilotRating}
			<Rating rating={pilotRating} kind="pilot" />
		{/if}
		<StaffBadges badges={staffBadges} />
		{#each certifications as certification (certification)}
			<Credential
				kind="certification"
				code={certification}
				name={credentialName(credentials, certification)}
			/>
		{/each}
		{#each endorsements as endorsement (endorsement)}
			<Credential
				kind="endorsement"
				code={endorsement}
				name={credentialName(credentials, endorsement)}
			/>
		{/each}
	</div>
</div>

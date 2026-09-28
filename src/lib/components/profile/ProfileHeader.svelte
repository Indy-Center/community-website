<script lang="ts">
	import MembershipBadge from '$lib/components/MembershipBadge.svelte';
	import StaffBadges from '$lib/components/StaffBadges.svelte';
	import Tooltip from '$lib/components/Tooltip.svelte';
	import type { StaffBadgeKey } from '$lib/config/staffBadges';
	import {
		getCertificationDisplayName,
		getEndorsementDisplayName
	} from '$lib/config/certifications';
	import IconAirplane from '~icons/mdi/airplane';
	import IconRating from '~icons/mdi/radar';

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
		endorsements = []
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
	} = $props();

	const CHIP =
		'inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-xs font-semibold text-white';
</script>

<div class="flex flex-wrap items-center gap-4">
	<MembershipBadge {membership} />
	<div>
		<h1 class="flex flex-wrap items-baseline gap-x-3 text-3xl font-bold text-white">
			{name}
			{#if pronouns}
				<span class="text-base font-normal text-gray-400">({pronouns})</span>
			{/if}
		</h1>
		<div class="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-400">
			<span class="font-mono">CID {cid}</span>
			{#if operatingInitials}
				<span
					class="rounded-md bg-indigo-600/80 px-2 py-0.5 font-mono text-xs font-semibold text-white"
					title="Operating initials">{operatingInitials}</span
				>
			{/if}
			{#if atcRating}
				<span
					class="flex items-center gap-1 rounded-md bg-sky-600/90 px-2 py-0.5 font-mono text-xs font-semibold text-white"
				>
					<IconRating class="h-3 w-3" />
					{atcRating}
				</span>
			{/if}
			{#if pilotRating}
				<span
					class="flex items-center gap-1 rounded-md bg-pink-600/80 px-2 py-0.5 font-mono text-xs font-semibold text-white"
				>
					<IconAirplane class="h-3 w-3" />
					{pilotRating}
				</span>
			{/if}
			<StaffBadges badges={staffBadges} />
			{#each certifications as certification (certification)}
				<Tooltip text={getCertificationDisplayName(certification)}>
					<span class="{CHIP} bg-emerald-600/80">{certification}</span>
				</Tooltip>
			{/each}
			{#each endorsements as endorsement (endorsement)}
				<Tooltip text={getEndorsementDisplayName(endorsement)}>
					<span class="{CHIP} bg-purple-600/80">{endorsement}</span>
				</Tooltip>
			{/each}
		</div>
	</div>
</div>

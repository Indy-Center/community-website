<script lang="ts">
	import MembershipBadge from '$lib/components/MembershipBadge.svelte';
	import StaffBadges from '$lib/components/StaffBadges.svelte';
	import type { StaffBadgeKey } from '$lib/config/staffBadges';
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
		staffBadges = []
	}: {
		name: string;
		pronouns: string | null;
		cid: string;
		membership: 'basic' | 'community' | 'controller';
		operatingInitials: string | null;
		atcRating: string | null;
		pilotRating: string | null;
		staffBadges?: StaffBadgeKey[];
	} = $props();
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
					class="rounded-md bg-slate-700 px-2 py-0.5 font-mono text-xs text-slate-200"
					title="Operating initials">{operatingInitials}</span
				>
			{/if}
			{#if atcRating}
				<span
					class="flex items-center gap-1 rounded-md bg-sky-600/30 px-2 py-0.5 font-mono text-xs text-sky-200"
				>
					<IconRating class="h-3 w-3" />
					{atcRating}
				</span>
			{/if}
			{#if pilotRating}
				<span
					class="flex items-center gap-1 rounded-md bg-pink-600/30 px-2 py-0.5 font-mono text-xs text-pink-200"
				>
					<IconAirplane class="h-3 w-3" />
					{pilotRating}
				</span>
			{/if}
			<StaffBadges badges={staffBadges} />
		</div>
	</div>
</div>

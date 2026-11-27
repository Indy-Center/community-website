<!--
	Design: a difference from a Centerline default, recorded as the tech docs ask. Centerline's
	OnlineController always draws its position with the controllers' preset (short name and sector).
	The home page's "Controllers online" is for pilots, so this is the same row with Position's
	pilots' preset instead: the radio name and frequency a pilot tunes. Everything else is
	OnlineController's own markup and helpers. Drop this for OnlineController once it can take the
	pilots' preset.
-->
<script lang="ts">
	import {
		logoffFromInfo,
		Member,
		parseCallsign,
		Position,
		Time,
		type OnlineMember
	} from '@indy-center/centerline-svelte';

	let {
		callsign,
		positionId,
		members
	}: {
		/** The callsign logged in, a relief login included: `IND_831_CTR`. */
		callsign: string;
		/** The vNAS position id, from the vNAS feed: matched instead of the callsign. */
		positionId?: string;
		/** Who is on the position: one, or two in a relief. */
		members: readonly OnlineMember[];
	} = $props();

	// The airport Position's pilots' preset shows for a cab or approach position, which vNAS doesn't
	// give: US callsigns start with the airport's FAA code (CVG_TWR, IND_DRE_APP), and its ICAO is K
	// before it. A center or TMU position has none.
	const airport = $derived.by(() => {
		const parts = parseCallsign(callsign);
		if (!parts || ['CTR', 'FSS', 'TMU'].includes(parts.type) || parts.prefix.length !== 3) return;
		return { code: `K${parts.prefix}` };
	});

	/** When `member` logs out, if known: the booking's end, else the info's. */
	function logoffOf(member: OnlineMember): Date | undefined {
		if (member.bookingEnd !== undefined) {
			const end = new Date(member.bookingEnd);
			if (!isNaN(end.getTime())) return end;
		}
		return logoffFromInfo(member.info, member.loggedInAt);
	}
</script>

<div>
	<Position
		{callsign}
		{positionId}
		show={['airport', 'radioName', 'frequency']}
		airportAt="right"
		{airport}
	/>
	{#each members as member, i (i)}
		{@const logoff = logoffOf(member)}
		<div class="mt-1 text-sm">
			<span class="block text-foreground-soft"
				><Member name={member.name} cid={member.cid} showCid={false} href={member.href} /><span
					class="text-muted-foreground"
					>{' '}<span aria-hidden="true">·</span>{' '}<Time
						value={member.loggedInAt}
						show="relative"
					/></span
				></span
			>
			{#if logoff}
				<span class="block text-muted-foreground"
					>Online until <Time value={logoff} zone="both" /></span
				>
			{/if}
		</div>
	{/each}
</div>

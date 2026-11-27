<script lang="ts">
	import { Chip, Tooltip } from '@indy-center/centerline-svelte';
	import { STAFF_BADGES, type StaffBadgeKey } from '$lib/config/staffBadges';

	let { badges }: { badges: StaffBadgeKey[] } = $props();

	// Keep the configured display order regardless of the order badges were passed in
	const shown = $derived(STAFF_BADGES.filter((badge) => badges.includes(badge.key)));
</script>

{#each shown as badge (badge.key)}
	<Tooltip text={badge.title}>
		{#snippet children(trigger)}
			<Chip variant={badge.group} {...trigger} tabindex={0}>{badge.label}</Chip>
		{/snippet}
	</Tooltip>
{/each}

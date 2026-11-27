<script lang="ts">
	import { Badge, Icon, type BadgeVariant } from '@indy-center/centerline-svelte';
	import {
		mdiAccountGroup,
		mdiAccountTie,
		mdiAirplane,
		mdiDotsHorizontal,
		mdiHome,
		mdiLifebuoy
	} from '@mdi/js';
	import { getEventTypeConfig } from '$lib/config/events';

	let { eventType, size = 'md' }: { eventType: string; size?: 'sm' | 'md' } = $props();

	const STYLES: Record<string, { icon: string; variant: BadgeVariant }> = {
		community: { icon: mdiAccountGroup, variant: 'sky' },
		support: { icon: mdiLifebuoy, variant: 'purple' },
		staffing: { icon: mdiAccountTie, variant: 'green' },
		home: { icon: mdiHome, variant: 'orange' },
		group_flight: { icon: mdiAirplane, variant: 'blue' },
		other: { icon: mdiDotsHorizontal, variant: 'gray' }
	};

	const label = $derived(
		getEventTypeConfig(eventType)?.label || eventType.charAt(0).toUpperCase() + eventType.slice(1)
	);
	const style = $derived(STYLES[eventType] ?? STYLES.community);
</script>

<Badge variant={style.variant} {size}>
	{#snippet icon()}<Icon path={style.icon} />{/snippet}
	{label}
</Badge>

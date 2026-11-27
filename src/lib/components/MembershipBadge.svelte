<script lang="ts">
	import { Badge, Icon, type BadgeVariant } from '@indy-center/centerline-svelte';
	import { mdiAccountGroup, mdiHandHeartOutline, mdiTransmissionTower } from '@mdi/js';

	let {
		membership,
		size = 'md'
	}: { membership: 'basic' | 'community' | 'controller'; size?: 'sm' | 'md' } = $props();

	// Said in words as well as colour and icon
	const STYLES: Record<string, { label: string; icon: string; variant: BadgeVariant }> = {
		basic: { label: 'Member', icon: mdiAccountGroup, variant: 'sky' },
		community: { label: 'Community member', icon: mdiHandHeartOutline, variant: 'purple' },
		controller: { label: 'Controller', icon: mdiTransmissionTower, variant: 'green' }
	};

	const style = $derived(STYLES[membership] ?? STYLES.basic);
</script>

<Badge variant={style.variant} {size}>
	{#snippet icon()}<Icon path={style.icon} />{/snippet}
	{style.label}
</Badge>

<script lang="ts">
	import { Badge, Icon, type BadgeVariant } from '@indy-center/centerline-svelte';
	import { mdiAccountGroup, mdiAccountOff, mdiAccountPlus } from '@mdi/js';

	let { rosterType, size = 'md' }: { rosterType: string; size?: 'sm' | 'md' } = $props();

	const STYLES: Record<string, { label: string; icon: string; variant: BadgeVariant }> = {
		none: { label: 'No roster', icon: mdiAccountOff, variant: 'green' },
		open: { label: 'Open roster', icon: mdiAccountPlus, variant: 'orange' },
		assigned: { label: 'Assigned roster', icon: mdiAccountGroup, variant: 'red' }
	};

	const style = $derived(
		STYLES[rosterType] ?? {
			label: rosterType.charAt(0).toUpperCase() + rosterType.slice(1),
			icon: mdiAccountGroup,
			variant: 'purple'
		}
	);
</script>

<Badge variant={style.variant} {size}>
	{#snippet icon()}<Icon path={style.icon} />{/snippet}
	{style.label}
</Badge>

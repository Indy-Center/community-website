<script lang="ts">
	import Badge from '$lib/components/Badge.svelte';
	import IconAccountGroup from '~icons/mdi/account-group';
	import IconAccountOff from '~icons/mdi/account-off';
	import IconAccountPlus from '~icons/mdi/account-plus';

	let { rosterType, size = 'md' }: { rosterType: string; size?: 'sm' | 'md' } = $props();

	const config = $derived.by(() => {
		switch (rosterType) {
			case 'none':
				return {
					label: 'No Roster',
					icon: IconAccountOff,
					color: 'green' as const
				};
			case 'open':
				return {
					label: 'Open Roster',
					icon: IconAccountPlus,
					color: 'orange' as const
				};
			case 'assigned':
				return {
					label: 'Assigned Roster',
					icon: IconAccountGroup,
					color: 'red' as const
				};
			default:
				return {
					label: rosterType.charAt(0).toUpperCase() + rosterType.slice(1),
					icon: IconAccountGroup,
					color: 'purple' as const
				};
		}
	});
</script>

<Badge icon={config.icon} label={config.label} {size} color={config.color} />

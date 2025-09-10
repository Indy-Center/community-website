<script lang="ts">
	import Badge from '$lib/components/Badge.svelte';
	import IconAccountGroup from '~icons/mdi/account-group';

	let { rosterType, size = 'md' }: { rosterType: string; size?: 'sm' | 'md' } = $props();

	const label = $derived.by(() => {
		switch (rosterType) {
			case 'none':
				return 'No Roster';
			case 'open':
				return 'Open Roster';
			case 'assigned':
				return 'Assigned Roster';
			default:
				return rosterType.charAt(0).toUpperCase() + rosterType.slice(1);
		}
	});
</script>

<Badge icon={IconAccountGroup} {label} {size} color="purple" />

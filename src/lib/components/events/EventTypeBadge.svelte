<script lang="ts">
	import Badge from '$lib/components/Badge.svelte';
	import IconAccountGroup from '~icons/mdi/account-group';
	import IconLifebuoy from '~icons/mdi/lifebuoy';

	let { eventType, size = 'md' }: { eventType: string; size?: 'sm' | 'md' } = $props();

	const config = $derived.by(() => {
		switch (eventType) {
			case 'community':
				return {
					label: 'Community',
					icon: IconAccountGroup,
					color: 'sky' as const
				};
			case 'support':
				return {
					label: 'Support',
					icon: IconLifebuoy,
					color: 'purple' as const
				};
			default:
				return {
					label: eventType.charAt(0).toUpperCase() + eventType.slice(1),
					icon: IconAccountGroup,
					color: 'sky' as const
				};
		}
	});
</script>

<Badge icon={config.icon} label={config.label} {size} color={config.color} />

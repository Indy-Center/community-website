<script lang="ts">
	import Badge from '$lib/components/Badge.svelte';
	import { getEventTypeConfig, supportsRosters } from '$lib/config/events';
	import IconAccountGroup from '~icons/mdi/account-group';
	import IconLifebuoy from '~icons/mdi/lifebuoy';
	import IconHome from '~icons/mdi/home';
	import IconAccountTie from '~icons/mdi/account-tie';
	import IconAirplane from '~icons/mdi/airplane';
	import IconDotsHorizontal from '~icons/mdi/dots-horizontal';

	let {
		eventType,
		rosterType,
		size = 'md'
	}: {
		eventType: string;
		rosterType?: string;
		size?: 'sm' | 'md';
	} = $props();

	const eventConfig = $derived(getEventTypeConfig(eventType));

	const config = $derived.by(() => {
		const label = eventConfig?.label || eventType.charAt(0).toUpperCase() + eventType.slice(1);

		switch (eventType) {
			case 'community':
				return {
					label,
					icon: IconAccountGroup,
					color: 'sky' as const
				};
			case 'support':
				return {
					label,
					icon: IconLifebuoy,
					color: 'purple' as const
				};
			case 'staffing':
				return {
					label,
					icon: IconAccountTie,
					color: 'green' as const
				};
			case 'home':
				return {
					label,
					icon: IconHome,
					color: 'orange' as const
				};
			case 'group_flight':
				return {
					label,
					icon: IconAirplane,
					color: 'blue' as const
				};
			case 'other':
				return {
					label,
					icon: IconDotsHorizontal,
					color: 'gray' as const
				};
			default:
				return {
					label,
					icon: IconAccountGroup,
					color: 'sky' as const
				};
		}
	});
</script>

<Badge icon={config.icon} label={config.label} {size} color={config.color} />

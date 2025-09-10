<script lang="ts">
	import IconBasicMembership from '~icons/mdi/account-group';
	import IconCommunityMembership from '~icons/mdi/hand-heart-outline';
	import IconControllerMembership from '~icons/mdi/transmission-tower';
	import Badge from './Badge.svelte';

	let {
		membership,
		size = 'md'
	}: { membership: 'basic' | 'community' | 'controller'; size?: 'sm' | 'md' } = $props();

	const MEMBERSHIP_MAP = {
		basic: {
			icon: IconBasicMembership,
			color: 'sky'
		},
		community: {
			icon: IconCommunityMembership,
			color: 'purple'
		},
		controller: {
			icon: IconControllerMembership,
			color: 'green'
		}
	};
</script>

<Badge
	{size}
	icon={MEMBERSHIP_MAP[membership as keyof typeof MEMBERSHIP_MAP].icon}
	color={MEMBERSHIP_MAP[membership as keyof typeof MEMBERSHIP_MAP].color as
		| 'sky'
		| 'purple'
		| 'green'}
/>

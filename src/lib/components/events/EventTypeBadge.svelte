<script lang="ts">
	import Badge from '$lib/components/Badge.svelte';
	import IconGlobe from '~icons/mdi/earth';

	let { eventType, size = 'md' }: { eventType: string; size?: 'sm' | 'md' } = $props();

	const label = eventType.charAt(0).toUpperCase() + eventType.slice(1);
</script>

<Badge icon={IconGlobe} {label} {size} color="sky" />

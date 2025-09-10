<script lang="ts">
	import Badge from '$lib/components/Badge.svelte';
	import IconGlobe from '~icons/mdi/earth';

	let { eventType }: { eventType: string } = $props();

	const label = eventType.charAt(0).toUpperCase() + eventType.slice(1);
</script>

<Badge icon={IconGlobe} {label} color="sky" />

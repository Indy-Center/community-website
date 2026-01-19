<script lang="ts">
	import type { VnasController } from '$lib/types/vnas';
	import ControllerRow from './ControllerRow.svelte';

	let { controllers }: { controllers: VnasController[] } = $props();


	// Gets the primary position of the controller.
	const displayedControllers = $derived.by(() => {
		return controllers
			.map((controller) => {
				return {
					...controller,
					primaryPosition: controller.positions.find(
						(position) => position.isPrimary
					)
				};
			})
			.filter((controller) => controller.primaryPosition);
	});
</script>

<div>
	{#if displayedControllers.length === 0}
		<div class="py-2">
			<span class="text-sm text-gray-500">No controllers online</span>
		</div>
	{:else}
		<div class="overflow-y-auto h-full">
			{#each displayedControllers as controller}
				<ControllerRow {controller} />
			{/each}
		</div>
	{/if}
</div>

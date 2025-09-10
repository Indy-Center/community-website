<script lang="ts">
	import Panel from '$lib/components/Panel.svelte';
	import IconAccountGroup from '~icons/mdi/account-group';
	import ControllerRow from './ControllerRow.svelte';
	import type { VnasController } from '$lib/types/vnas';

	let { controllers }: { controllers: VnasController[] } = $props();
</script>

<Panel
	title="Controllers Online"
	icon={IconAccountGroup}
	overflow={controllers.length > 0}
>
	<div class="grid grid-cols-1 gap-1">
		{#if controllers.length > 0}
			{#each controllers as controller}
				<ControllerRow {controller} />
			{/each}
		{:else}
			<div class="py-2">
				<span class="p-2 text-sm text-slate-400">No controllers online</span>
			</div>
		{/if}
	</div>
</Panel>

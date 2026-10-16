<!-- Shown in place of partners when the CMS is unavailable and no copy is kept. -->
<script lang="ts">
	import Panel from '$lib/components/Panel.svelte';
	import IconCloudOff from '~icons/mdi/cloud-off-outline';
</script>

<div class="mx-auto max-w-4xl">
	<Panel title="Unavailable" icon={IconCloudOff} mode="dark">
		<div class="p-8">
			<p class="leading-relaxed text-slate-300">Partners couldn't be loaded, try again later.</p>
		</div>
	</Panel>
</div>

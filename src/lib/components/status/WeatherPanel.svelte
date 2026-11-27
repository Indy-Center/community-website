<script lang="ts">
	import { Icon, Panel } from '@indy-center/centerline-svelte';
	import { mdiWeatherCloudy } from '@mdi/js';
	import type { VatsimMetarResponse } from '$lib/types/vatsim';
	import WeatherRow from './WeatherRow.svelte';

	let { metars }: { metars: VatsimMetarResponse } = $props();
</script>

<Panel title="Weather" level={2}>
	{#snippet icon()}<Icon path={mdiWeatherCloudy} />{/snippet}
	<ul class="grid grid-cols-1 gap-2 md:grid-cols-2">
		{#each metars as metar (metar.id)}
			<WeatherRow id={metar.id} metar={metar.metar} />
		{/each}
	</ul>
</Panel>

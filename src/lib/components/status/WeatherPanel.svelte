<script lang="ts">
	import Panel from '$lib/components/Panel.svelte';
	import type { VatsimMetarResponse } from '$lib/types';
	import WeatherRow from './WeatherRow.svelte';
	import IconWeatherCloudy from '~icons/mdi/weather-cloudy';

	let { metars }: { metars: VatsimMetarResponse } = $props();
</script>

<Panel title="Weather" icon={IconWeatherCloudy}>
	<div class="grid grid-cols-1 gap-2 p-4 md:grid-cols-2">
		{#each metars as metar}
			<WeatherRow id={metar.id} metar={metar.metar} />
		{/each}
	</div>
</Panel>

<script lang="ts">
	import Panel from '$lib/components/Panel.svelte';
	import type { VatsimMetarResponse } from '$lib/types';
	import WeatherRow from './WeatherRow.svelte';
	import IconWeatherCloudy from '~icons/mdi/weather-cloudy';

	let { metars }: { metars: VatsimMetarResponse } = $props();
</script>

<Panel title="Weather" icon={IconWeatherCloudy}>
	<div class="grid grid-cols-2 gap-2 p-4 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
		{#each metars as metar}
			<WeatherRow id={metar.id} metar={metar.metar} />
		{/each}
	</div>
</Panel>

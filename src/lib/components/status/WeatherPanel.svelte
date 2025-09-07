<script lang="ts">
	import Panel from '$lib/components/Panel.svelte';
	import type { VatsimMetarResponse } from '$lib/types';
	import WeatherRow from './WeatherRow.svelte';
	import IconWeatherCloudy from '~icons/mdi/weather-cloudy';

	let { metars }: { metars: VatsimMetarResponse } = $props();
</script>

<Panel title="Weather" icon={IconWeatherCloudy}>
	{#each metars as metar}
		<WeatherRow id={metar.id} metar={metar.metar} />
	{/each}
</Panel>

<script lang="ts">
	import IconWeatherWindy from '~icons/mdi/weather-windy';
	import IconEye from '~icons/mdi/eye';
	import IconThermometer from '~icons/mdi/thermometer';
	import IconGauge from '~icons/mdi/gauge';
	import IconCloud from '~icons/mdi/cloud';
	import IconWeatherRainy from '~icons/mdi/weather-rainy';
	import IconWeatherSnowy from '~icons/mdi/weather-snowy';
	import IconWeatherFog from '~icons/mdi/weather-fog';
	import IconChart from '~icons/mdi/chart-box-outline';
	import IconInformation from '~icons/mdi/information-outline';

	type Props = {
		id: string;
		metar: string;
	};

	let { id, metar }: Props = $props();

	function parseMetar(metar: string) {
		const parts = metar.split(' ');
		
		// Wind parsing - handle variable winds and calm conditions
		const windMatch = metar.match(/(\d{3})(\d{2,3})(?:G(\d{2,3}))?KT/) || 
		                  metar.match(/(VRB)(\d{2,3})(?:G(\d{2,3}))?KT/);
		const calmMatch = metar.match(/00000KT/);
		
		// Visibility parsing - handle various formats including P6SM (greater than 6)
		let visibility = null;
		const p6smMatch = metar.match(/P6SM/);
		const visibilityMatch = metar.match(/(\d+(?:\s+\d+\/\d+)?|\d+\/\d+)SM/);
		const m14smMatch = metar.match(/M1\/4SM/); // Less than 1/4 mile
		
		if (p6smMatch) {
			visibility = 10; // Treat P6SM as 10+ for flight rules
		} else if (m14smMatch) {
			visibility = 0.1; // Less than 1/4 mile
		} else if (visibilityMatch) {
			const visStr = visibilityMatch[1];
			if (visStr.includes('/')) {
				// Handle fractions like "3/4" or "1 1/4"
				const parts = visStr.split(' ');
				if (parts.length === 2) {
					// "1 1/4" format
					const whole = parseInt(parts[0]);
					const [num, den] = parts[1].split('/').map(Number);
					visibility = whole + num / den;
				} else {
					// "3/4" format
					const [num, den] = visStr.split('/').map(Number);
					visibility = num / den;
				}
			} else {
				visibility = parseInt(visStr);
			}
		}

		// Temperature and dewpoint
		const tempMatch = metar.match(/(M?\d{2})\/(M?\d{2})/);
		
		// Altimeter setting
		const altimeterMatch = metar.match(/A(\d{4})/);
		
		// Ceiling parsing - look for BKN or OVC layers
		const ceilingMatch = metar.match(/(?:BKN|OVC)(\d{3})/);
		const ceiling = ceilingMatch ? parseInt(ceilingMatch[1]) * 100 : null;

		// Weather phenomena parsing
		const weatherPhenomena = [];
		if (metar.includes('RA') || metar.includes('-RA') || metar.includes('+RA')) {
			weatherPhenomena.push('rain');
		}
		if (metar.includes('SN') || metar.includes('-SN') || metar.includes('+SN')) {
			weatherPhenomena.push('snow');
		}
		if (metar.includes('FG') || metar.includes('BR')) {
			weatherPhenomena.push('fog');
		}

		return {
			wind: calmMatch
				? { direction: '000', speed: '00', gusts: null, calm: true }
				: windMatch
				? {
						direction: windMatch[1],
						speed: windMatch[2],
						gusts: windMatch[3],
						variable: windMatch[1] === 'VRB'
					}
				: null,
			visibility,
			ceiling,
			temperature: tempMatch ? tempMatch[1].replace('M', '-') : null,
			dewpoint: tempMatch ? tempMatch[2].replace('M', '-') : null,
			altimeter: altimeterMatch ? (parseInt(altimeterMatch[1]) / 100).toFixed(2) : null,
			weatherPhenomena
		};
	}

	function getFlightConditions(visibility, ceiling) {
		// Determine the most restrictive condition
		let ceilingCategory = 'VFR';
		let visibilityCategory = 'VFR';

		// Ceiling categories
		if (ceiling !== null) {
			if (ceiling < 500) {
				ceilingCategory = 'LIFR';
			} else if (ceiling < 1000) {
				ceilingCategory = 'IFR';
			} else if (ceiling <= 3000) {
				ceilingCategory = 'MVFR';
			}
		}

		// Visibility categories  
		if (visibility !== null) {
			if (visibility < 1) {
				visibilityCategory = 'LIFR';
			} else if (visibility < 3) {
				visibilityCategory = 'IFR';
			} else if (visibility <= 5) {
				visibilityCategory = 'MVFR';
			}
		}

		// Take the most restrictive condition
		const categories = ['VFR', 'MVFR', 'IFR', 'LIFR'];
		const worstCategory = Math.max(
			categories.indexOf(ceilingCategory),
			categories.indexOf(visibilityCategory)
		);
		const finalCategory = categories[worstCategory];

		// Return appropriate styling for each category
		switch (finalCategory) {
			case 'LIFR':
				return { category: 'LIFR', color: 'text-purple-300', bg: 'bg-purple-500/20 border-purple-500/30' };
			case 'IFR':
				return { category: 'IFR', color: 'text-red-300', bg: 'bg-red-500/20 border-red-500/30' };
			case 'MVFR':
				return { category: 'MVFR', color: 'text-blue-300', bg: 'bg-blue-500/20 border-blue-500/30' };
			case 'VFR':
			default:
				return { category: 'VFR', color: 'text-green-300', bg: 'bg-green-500/20 border-green-500/30' };
		}
	}

	const parsed = $derived(parseMetar(metar));
	const flightConditions = $derived(getFlightConditions(parsed.visibility, parsed.ceiling));
</script>

<div class="group flex flex-col gap-1.5 rounded-r-md border border-slate-700/50 px-2.5 py-2 shadow-sm transition-all hover:shadow-md border-l-[3px] {flightConditions.category === 'VFR' ? 'border-l-green-500 bg-slate-800/60 hover:bg-slate-800/80' : flightConditions.category === 'MVFR' ? 'border-l-blue-500 bg-slate-800/60 hover:bg-slate-800/80' : flightConditions.category === 'IFR' ? 'border-l-red-500 bg-slate-800/60 hover:bg-slate-800/80' : 'border-l-purple-500 bg-slate-800/60 hover:bg-slate-800/80'}">
	<!-- Header: Airport code and flight category -->
	<div class="flex items-center justify-between">
		<div class="font-mono text-base font-semibold tracking-wide text-slate-100">
			{id}
		</div>
		<div class="flex items-center gap-1">
			<a
				href="https://metar-taf.com/{id}"
				target="_blank"
				rel="noopener noreferrer"
				class="rounded p-0.5 text-slate-400 transition-colors hover:bg-slate-700/50 hover:text-sky-400"
				title="View METAR/TAF for {id}"
			>
				<IconInformation class="h-4 w-4" />
			</a>
			<a
				href="https://tools.flyindycenter.com/charts?airport={id}"
				target="_blank"
				rel="noopener noreferrer"
				class="rounded p-0.5 text-slate-400 transition-colors hover:bg-slate-700/50 hover:text-sky-400"
				title="View charts for {id}"
			>
				<IconChart class="h-4 w-4" />
			</a>
			<div class="rounded bg-slate-700/40 px-1.5 py-0.5 text-xs font-semibold {flightConditions.color}">
				{flightConditions.category}
			</div>
		</div>
	</div>

	<!-- Main weather data grid -->
	<div class="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
		<!-- Wind -->
		<div class="flex items-center gap-1">
			<IconWeatherWindy class="h-3 w-3 flex-shrink-0 text-slate-400" />
			{#if parsed.wind && !parsed.wind.calm}
				<span class="text-slate-100">
					{#if parsed.wind.variable}
						<span class="text-yellow-400">VRB</span>
					{:else}
						<span class="text-slate-200">{parsed.wind.direction}°</span>
					{/if}
					<span class="text-slate-400">@</span>
					<span class="text-sky-400">{parsed.wind.speed}</span>
					{#if parsed.wind.gusts}
						<span class="text-orange-400">G{parsed.wind.gusts}</span>
					{/if}
				</span>
			{:else if parsed.wind?.calm}
				<span class="text-slate-300">Calm</span>
			{/if}
		</div>

		<!-- Altimeter -->
		<div class="flex items-center gap-1">
			<IconGauge class="h-3 w-3 flex-shrink-0 text-slate-400" />
			<span class="text-slate-200">
				{parsed.altimeter || '--'}"
			</span>
		</div>

		<!-- Temperature/Dewpoint -->
		<div class="flex items-center gap-1">
			<IconThermometer class="h-3 w-3 flex-shrink-0 text-slate-400" />
			{#if parsed.temperature && parsed.dewpoint}
				<span class="text-slate-100">
					<span class="text-orange-300">{parsed.temperature}°</span>
					<span class="text-slate-400">/</span>
					<span class="text-cyan-300">{parsed.dewpoint}°</span>
				</span>
			{:else}
				<span class="text-slate-400">--</span>
			{/if}
		</div>

		<!-- Visibility -->
		<div class="flex items-center gap-1">
			<IconEye class="h-3 w-3 flex-shrink-0 text-slate-400" />
			<span class="text-slate-200">
				{parsed.visibility !== null ? (parsed.visibility >= 10 ? '10+' : parsed.visibility) + 'SM' : '--'}
			</span>
		</div>

		<!-- Ceiling -->
		<div class="col-span-2 flex items-center gap-1">
			<IconCloud class="h-3 w-3 flex-shrink-0 text-slate-400" />
			<span class="text-slate-200">
				{parsed.ceiling !== null ? (parsed.ceiling >= 10000 ? (parsed.ceiling).toLocaleString() : (parsed.ceiling / 100).toFixed(0) + (parsed.ceiling < 1000 ? '' : '00')) + 'ft' : 'Unlimited'}
			</span>
		</div>
	</div>

	<!-- Weather phenomena (only show if present) -->
	{#if parsed.weatherPhenomena.length > 0}
		<div class="flex items-center gap-1.5">
			{#each parsed.weatherPhenomena as phenomenon}
				<div class="group/icon relative">
					{#if phenomenon === 'rain'}
						<IconWeatherRainy class="h-3.5 w-3.5 text-blue-400 transition-colors group-hover/icon:text-blue-300" />
						<div class="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900/95 px-2 py-1 text-xs text-slate-200 opacity-0 shadow-lg transition-opacity group-hover/icon:opacity-100">
							Rain
						</div>
					{:else if phenomenon === 'snow'}
						<IconWeatherSnowy class="h-3.5 w-3.5 text-blue-200 transition-colors group-hover/icon:text-blue-100" />
						<div class="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900/95 px-2 py-1 text-xs text-slate-200 opacity-0 shadow-lg transition-opacity group-hover/icon:opacity-100">
							Snow
						</div>
					{:else if phenomenon === 'fog'}
						<IconWeatherFog class="h-3.5 w-3.5 text-slate-400 transition-colors group-hover/icon:text-slate-300" />
						<div class="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900/95 px-2 py-1 text-xs text-slate-200 opacity-0 shadow-lg transition-opacity group-hover/icon:opacity-100">
							Fog
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

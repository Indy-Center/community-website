<script lang="ts">
	import IconWeatherWindy from '~icons/mdi/weather-windy';
	import IconEye from '~icons/mdi/eye';
	import IconThermometer from '~icons/mdi/thermometer';
	import IconGauge from '~icons/mdi/gauge';
	import IconChevronDown from '~icons/mdi/chevron-down';

	type Props = {
		id: string;
		metar: string;
	};

	let { id, metar }: Props = $props();

	let expanded = $state(false);

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
			altimeter: altimeterMatch ? (parseInt(altimeterMatch[1]) / 100).toFixed(2) : null
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

<div
	class="group relative flex items-center gap-3 rounded border border-slate-700/60 bg-slate-800/60 px-3 py-2 transition-all hover:border-sky-500/30"
>
	<!-- Airport code with flight conditions color -->
	<div
		class="flex-shrink-0 rounded-sm border px-1.5 py-0.5 font-mono text-sm font-bold {flightConditions.color} {flightConditions.bg}"
	>
		{id}
	</div>

	<!-- Weather info -->
	<div class="flex-1 space-y-0.5 text-xs">
		<!-- Wind -->
		<div class="flex items-center gap-1">
			<IconWeatherWindy class="h-3 w-3 text-slate-400" />
			{#if parsed.wind && !parsed.wind.calm}
				<span class="font-medium text-slate-200">
					{#if parsed.wind.variable}<span class="text-yellow-400">VRB</span>{:else}{parsed.wind.direction}°{/if}@<span class="text-sky-300">{parsed.wind.speed}</span>{#if parsed.wind.gusts}<span class="text-orange-400">G{parsed.wind.gusts}</span>{/if}
				</span>
			{:else if parsed.wind?.calm}
				<span class="text-slate-200 font-medium">Calm</span>
			{/if}
		</div>
		
		<!-- Altimeter -->
		{#if parsed.altimeter}
			<div class="flex items-center gap-1">
				<IconGauge class="h-3 w-3 text-slate-400" />
				<span class="font-medium text-slate-200">
					{parsed.altimeter}"
				</span>
			</div>
		{/if}
	</div>
</div>

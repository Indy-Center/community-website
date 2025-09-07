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
		const windMatch = metar.match(/(\d{3})(\d{2,3})(?:G(\d{2,3}))?KT/);
		const visibilityMatch = metar.match(/(\d+(?:\s+\d+\/\d+)?|\d+\/\d+)SM/);
		const tempMatch = metar.match(/(M?\d{2})\/(M?\d{2})/);
		const altimeterMatch = metar.match(/A(\d{4})/);
		const ceilingMatch = metar.match(/(?:BKN|OVC)(\d{3})/);

		// Parse visibility - handle fractions like "1 1/4SM"
		let visibility = null;
		if (visibilityMatch) {
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

		// Parse ceiling height (in hundreds of feet)
		const ceiling = ceilingMatch ? parseInt(ceilingMatch[1]) * 100 : null;

		return {
			wind: windMatch
				? {
						direction: windMatch[1],
						speed: windMatch[2],
						gusts: windMatch[3]
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
		// LIFR: Ceiling < 500ft or Visibility < 1SM
		if ((ceiling !== null && ceiling < 500) || (visibility !== null && visibility < 1)) {
			return { category: 'LIFR', color: 'text-red-600', bg: 'bg-red-50' };
		}
		// IFR: Ceiling 500-999ft or Visibility 1-2SM
		if (
			(ceiling !== null && ceiling >= 500 && ceiling < 1000) ||
			(visibility !== null && visibility >= 1 && visibility < 3)
		) {
			return { category: 'IFR', color: 'text-red-500', bg: 'bg-red-50' };
		}
		// MVFR: Ceiling 1000-3000ft or Visibility 3-5SM
		if (
			(ceiling !== null && ceiling >= 1000 && ceiling <= 3000) ||
			(visibility !== null && visibility >= 3 && visibility <= 5)
		) {
			return { category: 'MVFR', color: 'text-blue-600', bg: 'bg-blue-50' };
		}
		// VFR: Everything else
		return { category: 'VFR', color: 'text-green-600', bg: 'bg-green-50' };
	}

	const parsed = $derived(parseMetar(metar));
	const flightConditions = $derived(getFlightConditions(parsed.visibility, parsed.ceiling));
</script>

<div class="border-b border-gray-100 last:border-b-0">
	<button
		class="flex w-full cursor-pointer items-center justify-between gap-4 px-3 py-2 text-left transition-colors hover:bg-gray-50"
		onclick={() => (expanded = !expanded)}
	>
		<div class="flex items-center gap-2">
			<IconChevronDown
				class="h-3 w-3 text-gray-500 {expanded
					? 'rotate-180'
					: ''} transition-transform duration-200"
			/>

			<div
				class="flex-shrink-0 rounded-sm border-1 px-1 py-0.5 font-mono text-sm font-bold {flightConditions.color} {flightConditions.bg}"
			>
				{id}
			</div>
		</div>
		<div class="flex flex-wrap items-center gap-3 text-xs">
			{#if parsed.wind}
				<div class="flex items-center gap-1 text-gray-700">
					<IconWeatherWindy class="h-3 w-3 text-gray-500" />
					<span
						>{parsed.wind.direction}° {parsed.wind.speed}kt{#if parsed.wind.gusts}<span
								class="ml-1 text-orange-600">G{parsed.wind.gusts}</span
							>{/if}</span
					>
				</div>
			{/if}
			{#if parsed.visibility !== null}
				<div class="flex items-center gap-1 text-gray-700">
					<IconEye class="h-3 w-3 text-gray-500" />
					<span
						>{parsed.visibility % 1 === 0
							? parsed.visibility
							: parsed.visibility.toFixed(2).replace(/\.?0+$/, '')}SM</span
					>
				</div>
			{/if}
			{#if parsed.temperature}
				<div class="flex items-center gap-1 text-gray-700">
					<IconThermometer class="h-3 w-3 text-gray-500" />
					<span>{parsed.temperature}°C</span>
				</div>
			{/if}
			{#if parsed.altimeter}
				<div class="flex items-center gap-1 text-gray-700">
					<IconGauge class="h-3 w-3 text-gray-500" />
					<span>{parsed.altimeter}"</span>
				</div>
			{/if}
		</div>
	</button>
	{#if expanded}
		<div class="px-3 pb-2">
			<code class="block rounded bg-gray-100 px-2 py-1 font-mono text-xs text-gray-600"
				>{metar}</code
			>
		</div>
	{/if}
</div>

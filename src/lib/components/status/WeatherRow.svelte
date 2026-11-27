<script lang="ts">
	import {
		Airport,
		FlightCategory,
		Icon,
		type FlightCategoryCode
	} from '@indy-center/centerline-svelte';
	import {
		mdiChartBoxOutline,
		mdiCloud,
		mdiEye,
		mdiGauge,
		mdiInformationOutline,
		mdiThermometer,
		mdiWeatherFog,
		mdiWeatherRainy,
		mdiWeatherSnowy,
		mdiWeatherWindy
	} from '@mdi/js';

	type Props = {
		id: string;
		metar: string;
	};

	let { id, metar }: Props = $props();

	function parseMetar(metar: string) {
		const parts = metar.split(' ');

		// Wind parsing - handle variable winds and calm conditions
		const windMatch =
			metar.match(/(\d{3})(\d{2,3})(?:G(\d{2,3}))?KT/) ||
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
		const weatherPhenomena: ('rain' | 'snow' | 'fog')[] = [];
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

	function getFlightConditions(visibility: number | null, ceiling: number | null) {
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
		return categories[worstCategory] as FlightCategoryCode;
	}

	const parsed = $derived(parseMetar(metar));
	const category = $derived(getFlightConditions(parsed.visibility, parsed.ceiling));

	const PHENOMENA = {
		rain: { label: 'Rain', icon: mdiWeatherRainy },
		snow: { label: 'Snow', icon: mdiWeatherSnowy },
		fog: { label: 'Fog or mist', icon: mdiWeatherFog }
	} as const;
</script>

<li class="flex flex-col gap-1.5 rounded-lg border border-border bg-card px-3 py-2">
	<div class="flex items-center justify-between gap-2">
		<Airport airport={{ code: id }} class="font-semibold text-foreground" />
		<div class="flex items-center gap-1">
			<a
				href="https://metar-taf.com/{id}"
				target="_blank"
				rel="noopener noreferrer"
				aria-label="METAR and TAF for {id} (opens in a new tab)"
				class="inline-flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
			>
				<Icon path={mdiInformationOutline} />
			</a>
			<a
				href="https://tools.flyindycenter.com/charts?airport={id}"
				aria-label="Charts for {id}"
				class="inline-flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
			>
				<Icon path={mdiChartBoxOutline} />
			</a>
			<FlightCategory {category} />
		</div>
	</div>

	<dl class="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-foreground-soft">
		<div class="flex items-center gap-1">
			<dt><Icon path={mdiWeatherWindy} label="Wind" class="text-muted-foreground" /></dt>
			<dd class="font-mono">
				{#if parsed.wind?.calm}
					Calm
				{:else if parsed.wind}
					{parsed.wind.variable ? 'VRB' : `${parsed.wind.direction}°`} @ {parsed.wind
						.speed}{#if parsed.wind.gusts}&nbsp;G{parsed.wind.gusts}{/if}
				{:else}
					--
				{/if}
			</dd>
		</div>
		<div class="flex items-center gap-1">
			<dt><Icon path={mdiGauge} label="Altimeter" class="text-muted-foreground" /></dt>
			<dd class="font-mono">{parsed.altimeter ? `${parsed.altimeter}"` : '--'}</dd>
		</div>
		<div class="flex items-center gap-1">
			<dt>
				<Icon
					path={mdiThermometer}
					label="Temperature and dew point"
					class="text-muted-foreground"
				/>
			</dt>
			<dd class="font-mono">
				{parsed.temperature && parsed.dewpoint
					? `${parsed.temperature}° / ${parsed.dewpoint}°`
					: '--'}
			</dd>
		</div>
		<div class="flex items-center gap-1">
			<dt><Icon path={mdiEye} label="Visibility" class="text-muted-foreground" /></dt>
			<dd class="font-mono">
				{parsed.visibility !== null
					? (parsed.visibility >= 10 ? '10+' : parsed.visibility) + 'SM'
					: '--'}
			</dd>
		</div>
		<div class="col-span-2 flex items-center gap-1">
			<dt><Icon path={mdiCloud} label="Ceiling" class="text-muted-foreground" /></dt>
			<dd class="font-mono">
				{parsed.ceiling !== null ? `${parsed.ceiling.toLocaleString()}ft` : 'Unlimited'}
			</dd>
		</div>
	</dl>

	{#if parsed.weatherPhenomena.length > 0}
		<ul class="flex flex-wrap items-center gap-3 text-xs text-foreground-soft">
			{#each parsed.weatherPhenomena as phenomenon (phenomenon)}
				<li class="flex items-center gap-1">
					<Icon path={PHENOMENA[phenomenon].icon} class="text-muted-foreground" />
					{PHENOMENA[phenomenon].label}
				</li>
			{/each}
		</ul>
	{/if}
</li>

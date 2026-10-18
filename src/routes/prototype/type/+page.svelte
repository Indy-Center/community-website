<script lang="ts">
	// PROTOTYPE (prototype/type): one page with the heading scale, body text,
	// labels, CIDs and ratings, and what each webfont costs.
	import { page } from '$app/state';
	import Panel from '$lib/components/Panel.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import { fonts, monos, readChoice, filesFor, steps, type Step } from '$lib/prototype/type/type';

	let { data } = $props();

	const choice = $derived.by(() => {
		const url = page.url.searchParams;
		const cookie = new URLSearchParams(data.typePrototype);
		return readChoice((k) => url.get(k) ?? cookie.get(k));
	});
	const files = $derived(filesFor(choice));
	const kb = (list: { kb: number }[]) => list.reduce((sum, f) => sum + f.kb, 0);

	// Every font and mono pairing, with what it downloads.
	const costs = fonts.flatMap((f) =>
		monos.map((m) => ({ font: f, mono: m, kb: kb([...f.files, ...m.files]) }))
	);

	// Literal class names, so Tailwind generates them.
	const sizeClass: Record<Step, string> = {
		xs: 'text-xs',
		sm: 'text-sm',
		base: 'text-base',
		lg: 'text-lg',
		xl: 'text-xl',
		'2xl': 'text-2xl',
		'3xl': 'text-3xl',
		'4xl': 'text-4xl',
		'5xl': 'text-5xl',
		'6xl': 'text-6xl'
	};
	const usedFor: Partial<Record<Step, string>> = {
		xs: 'badges, fine print, CIDs',
		sm: 'labels, table text, buttons',
		base: 'body text',
		lg: 'lead paragraphs',
		xl: 'card titles',
		'2xl': 'section headings',
		'3xl': 'page titles',
		'4xl': 'hero headings',
		'5xl': 'home hero'
	};

	const rows = [
		{ name: 'Alex Rivera', cid: '1234567', rating: 'C1', hours: '412.5', status: 'Home' },
		{ name: 'Sam Patel', cid: '1456789', rating: 'S3', hours: '88.0', status: 'Visiting' },
		{ name: 'Jordan Lee', cid: '1600002', rating: 'S1', hours: '17.25', status: 'Home' },
		{ name: 'Casey Morgan', cid: '1711111', rating: 'OBS', hours: '1.5', status: 'Inactive' },
		{ name: 'Renée Okafor', cid: '1888888', rating: 'I1', hours: '1,204.0', status: 'Home' }
	];
	const ratings = ['OBS', 'S1', 'S2', 'S3', 'C1', 'C3', 'I1', 'I3', 'SUP', 'ADM'];
</script>

<svelte:head>
	<title>Type prototype | Indy Center</title>
</svelte:head>

<div class="space-y-8 pb-40">
	<header class="space-y-2">
		<p class="text-xs font-semibold tracking-widest text-sky-400 uppercase">
			Type prototype · {choice.scheme === 'dark' ? 'dark' : 'light'}
		</p>
		<h1 class="text-3xl font-bold text-white">
			{choice.font.name} · {choice.mono.name} · {choice.scale.name}
		</h1>
		<ul class="max-w-3xl space-y-1 text-gray-300">
			<li><strong class="text-white">Font {choice.font.key}:</strong> {choice.font.note}</li>
			<li><strong class="text-white">Mono {choice.mono.key}:</strong> {choice.mono.note}</li>
			<li><strong class="text-white">Scale {choice.scale.key}:</strong> {choice.scale.note}</li>
		</ul>
		<p class="max-w-3xl text-sm text-gray-400">
			Each question has its own row on the bar at the bottom, and its own URL parameter:
			<code class="font-mono">?font=B&amp;mono=A&amp;scale=C&amp;scheme=light</code>. The choice
			holds while you browse the rest of the site: try
			<a class="text-sky-400 underline" href="/staff">Staff</a>,
			<a class="text-sky-400 underline" href="/roster">Roster</a>,
			<a class="text-sky-400 underline" href="/events">Events</a>,
			<a class="text-sky-400 underline" href="/visit/get-connected">Get connected</a> and
			<a class="text-sky-400 underline" href="/contact">Contact</a>. The palette is the settled one
			(dark A, light L4).
		</p>
	</header>

	<!-- Scale -->
	<Panel title="Heading scale">
		<div class="overflow-x-auto p-4">
			<table class="w-full min-w-[560px]">
				<thead class="border-b border-slate-600/50 bg-slate-700/50">
					<tr>
						<th class="px-3 py-2 text-left text-sm font-medium text-gray-300">Class</th>
						<th class="px-3 py-2 text-right text-sm font-medium text-gray-300">px / line</th>
						<th class="px-3 py-2 text-left text-sm font-medium text-gray-300">Sample</th>
					</tr>
				</thead>
				<tbody>
					{#each [...steps].reverse() as step (step)}
						{@const size = choice.scale.sizes[step]}
						<tr class="border-b border-slate-700/30 align-baseline">
							<td class="px-3 py-2 text-sm whitespace-nowrap text-gray-300">
								<span class="block font-mono">{sizeClass[step]}</span>
								<span class="block text-xs text-gray-400">{usedFor[step] ?? ''}</span>
							</td>
							<td class="px-3 py-2 text-right font-mono text-sm whitespace-nowrap text-gray-300">
								{size.px} / {Math.round(size.px * size.lineHeight)}
							</td>
							<td class="px-3 py-2 {sizeClass[step]} font-bold text-white">
								<span style="font-family:var(--font-heading)">Indianapolis Center</span>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</Panel>

	<!-- Headings and body -->
	<Panel title="Headings and body text">
		<article class="max-w-3xl space-y-4 p-4 text-gray-300">
			<h2 class="text-3xl font-bold text-white">Become a visiting controller</h2>
			<p class="text-lg">
				Indy Center welcomes controllers from across the VATSIM network. Visiting lets you work our
				airspace while keeping your home facility.
			</p>
			<h3 class="text-2xl font-semibold text-white">What you need</h3>
			<p>
				You need an <strong class="text-white">S3 rating or higher</strong>, held for at least
				<em>50 hours</em> on your current rating, and a home facility that agrees to your visit.
				Read the <a class="text-sky-400 underline" href="/visit/get-connected">visiting policy</a> before
				you apply. Most applications are reviewed within a week; the training team will contact you on
				Discord to book your first session at Indianapolis (KIND) or Louisville (KSDF).
			</p>
			<h4 class="text-xl font-semibold text-white">Weights</h4>
			<p class="space-x-4 text-2xl text-white">
				<span class="font-light">Light 300</span>
				<span class="font-normal">Regular 400</span>
				<span class="font-semibold">Semibold 600</span>
				<span class="font-bold">Bold 700</span>
				<span class="font-black">Black 900</span>
			</p>
			<p class="text-4xl text-white" style="font-family:var(--font-heading)">
				<span class="font-black">Indy</span> <span class="font-light">Center</span>
				<span class="ml-2 align-middle text-sm text-gray-400" style="font-family:var(--font-sans)"
					>the logo’s pattern: Black and Light</span
				>
			</p>
			<p class="text-sm text-gray-400">
				Fine print: this site is not affiliated with the FAA or any governing aviation body.
			</p>
		</article>
	</Panel>

	<!-- Labels -->
	<Panel title="Small capitals labels">
		<div class="grid gap-6 p-4 sm:grid-cols-2">
			<div class="space-y-3">
				<p class="text-sm text-gray-400">
					Today: capitals, spaced out (<code class="font-mono">uppercase tracking-wide</code>), as
					on every panel title on the site.
				</p>
				<p class="text-xs font-semibold tracking-widest text-sky-400 uppercase">Upcoming events</p>
				<p class="text-sm font-semibold tracking-wide text-white uppercase">Controller roster</p>
				<p class="text-xs font-semibold tracking-wider text-gray-400 uppercase">
					Home · Visiting · Inactive
				</p>
			</div>
			<div class="space-y-3">
				<p class="text-sm text-gray-400">
					Small capitals (<code class="font-mono">font-variant-caps: all-small-caps</code>), lightly
					spaced. Where the font has no small capitals, the browser shrinks capitals instead.
				</p>
				<p
					class="text-sm font-semibold tracking-widest text-sky-400"
					style="font-variant-caps:all-small-caps"
				>
					Upcoming events
				</p>
				<p
					class="text-base font-semibold tracking-wide text-white"
					style="font-variant-caps:all-small-caps"
				>
					Controller roster
				</p>
				<p
					class="text-sm font-semibold tracking-wider text-gray-400"
					style="font-variant-caps:all-small-caps"
				>
					Home · Visiting · Inactive
				</p>
			</div>
		</div>
	</Panel>

	<!-- Mono -->
	<Panel title="CIDs and ratings">
		<div class="space-y-4 p-4">
			<div class="flex flex-wrap gap-2">
				{#each ratings as r (r)}
					<span
						class="inline-flex items-center rounded-md bg-sky-600 px-2 py-0.5 font-mono text-xs font-semibold text-white"
						>{r}</span
					>
				{/each}
			</div>
			<div class="overflow-x-auto">
				<table class="w-full min-w-[560px]">
					<thead class="border-b border-slate-600/50 bg-slate-700/50">
						<tr>
							<th class="px-4 py-3 text-left text-sm font-medium text-gray-300">Controller</th>
							<th class="px-4 py-3 text-left text-sm font-medium text-gray-300">CID</th>
							<th class="px-4 py-3 text-left text-sm font-medium text-gray-300">Rating</th>
							<th class="px-4 py-3 text-right text-sm font-medium text-gray-300">Hours</th>
							<th class="px-4 py-3 text-left text-sm font-medium text-gray-300">Membership</th>
						</tr>
					</thead>
					<tbody>
						{#each rows as row (row.cid)}
							<tr class="border-b border-slate-700/30">
								<td class="px-4 py-3 font-medium text-white">{row.name}</td>
								<td class="px-4 py-3 font-mono text-sm text-gray-300">{row.cid}</td>
								<td class="px-4 py-3"><Badge size="sm" color="sky" label={row.rating} /></td>
								<td class="px-4 py-3 text-right font-mono text-sm text-gray-300">{row.hours}</td>
								<td class="px-4 py-3 text-sm text-gray-300">{row.status}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			<p class="text-sm text-gray-300">
				In a sentence: thanks to <span class="font-mono">1234567</span> (<span class="font-mono"
					>C1</span
				>) for covering <span class="font-mono">IND_CTR</span> on
				<span class="font-mono">134.000</span>.
			</p>
			<code class="block rounded bg-slate-700/50 px-2 py-1 font-mono text-xs text-gray-300">
				KIND 181654Z 27012G20KT 10SM FEW045 BKN250 18/07 A3002 RMK AO2 SLP168
			</code>
			<p class="text-sm text-gray-400">
				Look for: 0 against O, 1 against l and I, and whether the digits line up down the columns.
			</p>
		</div>
	</Panel>

	<!-- Cost -->
	<Panel title="What a webfont costs">
		<div class="space-y-4 p-4 text-gray-300">
			<p>
				This choice downloads
				{#if files.length === 0}
					<strong class="text-white">nothing</strong>: every font is already on the device.
				{:else}
					<strong class="text-white">{kb(files).toFixed(1)} KB</strong>
					in {files.length} file{files.length === 1 ? '' : 's'}:
					{files
						.map((f) => `${f.family}${f.style === 'italic' ? ' italic' : ''} (${f.kb} KB)`)
						.join(', ')}.
				{/if}
			</p>
			<div class="overflow-x-auto">
				<table class="w-full min-w-[480px] text-sm">
					<thead class="border-b border-slate-600/50 bg-slate-700/50">
						<tr>
							<th class="px-3 py-2 text-left font-medium text-gray-300">Font</th>
							<th class="px-3 py-2 text-left font-medium text-gray-300">Mono</th>
							<th class="px-3 py-2 text-right font-medium text-gray-300">Download</th>
						</tr>
					</thead>
					<tbody>
						{#each costs as c (c.font.key + c.mono.key)}
							{@const current = c.font === choice.font && c.mono === choice.mono}
							<tr class="border-b border-slate-700/30 {current ? 'bg-sky-500/10' : ''}">
								<td class="px-3 py-2">{c.font.key} · {c.font.name}</td>
								<td class="px-3 py-2">{c.mono.key} · {c.mono.name}</td>
								<td class="px-3 py-2 text-right font-mono {current ? 'text-white' : ''}"
									>{c.kb ? `${c.kb.toFixed(1)} KB` : '0'}</td
								>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			<ul class="list-disc space-y-2 pl-5 text-sm">
				<li>
					<strong class="text-white">Size.</strong> Each file is a variable font (every weight from 200
					to 900 in one file), cut to the Latin characters Google Fonts serves for English and Western
					European names. Sizes are those files, already compressed (WOFF2).
				</li>
				<li>
					<strong class="text-white">Loading.</strong> Served from our own domain with the page,
					preloaded in the page’s head, and cached by the browser after the first visit, so only a
					member’s first page pays. On a slow phone connection that first page shows the system font
					for a moment, then swaps (<code class="font-mono">font-display: swap</code>), so text is
					never hidden but can shift slightly as it swaps. Fallback metrics tuned to Source Sans 3
					can keep that shift small.
				</li>
				<li>
					<strong class="text-white">Characters outside the subset</strong> (some Polish, Czech or Turkish
					letters in member names) fall back to the system font letter by letter unless the Latin Extended
					file is added too: about 60 KB for Source Sans 3 and 34 KB for Source Code Pro, fetched only
					on a page that uses one of those letters.
				</li>
				<li>
					<strong class="text-white">The system stack</strong> costs nothing and never shifts, but looks
					different on Apple, Windows and Android, and graphics made in Source Sans 3 won’t match the
					apps.
				</li>
				<li>
					<strong class="text-white">Every app</strong> would ship the same files. Each app serving its
					own copy means one download per app; serving them from one shared address means one download
					for all of Indy Center.
				</li>
			</ul>
		</div>
	</Panel>
</div>

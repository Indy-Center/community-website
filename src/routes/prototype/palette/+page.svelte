<script lang="ts">
	// PROTOTYPE (prototype/palette): one page with every role the palette sets,
	// its contrast report, and the site's own components with sample data.
	import { page } from '$app/state';
	import Panel from '$lib/components/Panel.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import Pagination from '$lib/components/Pagination.svelte';
	import { contrastReport, readChoice, roleSwatches } from '$lib/prototype/palette/palettes';

	let { data } = $props();

	const choice = $derived.by(() => {
		const url = page.url.searchParams;
		const source = url.has('variant') ? url : new URLSearchParams(data.palettePrototype);
		return readChoice((k) => source.get(k));
	});
	const report = $derived(contrastReport(choice.palette, choice.scheme));
	const swatches = $derived(roleSwatches(choice.palette, choice.scheme));
	const failing = $derived(report.filter((r) => !r.pass));

	let pageNumber = $state(2);

	const rows = [
		{ name: 'Alex Rivera', cid: '1234567', rating: 'C1', status: 'Home', roles: ['Instructor'] },
		{ name: 'Sam Patel', cid: '1456789', rating: 'S3', status: 'Visiting', roles: [] },
		{ name: 'Jordan Lee', cid: '1600002', rating: 'S1', status: 'Home', roles: ['Events'] },
		{ name: 'Casey Morgan', cid: '1712345', rating: 'OBS', status: 'Inactive', roles: [] }
	];
</script>

<svelte:head>
	<title>Palette prototype | Indy Center</title>
</svelte:head>

<div class="space-y-8 pb-28">
	<header class="space-y-2">
		<p class="text-xs font-semibold tracking-widest text-sky-400 uppercase">
			Palette prototype · light, round 3
		</p>
		<h1 class="text-3xl font-bold text-white">
			{#if choice.scheme === 'light'}
				{choice.palette.key} · {choice.palette.name}
			{:else}
				Dark (settled: slate with the AA fixes)
			{/if}
		</h1>
		<p class="max-w-3xl text-gray-300">
			{#if choice.scheme === 'light'}
				{choice.palette.note}
			{:else}
				Round 1 settled dark. Flip back to Light to compare the light options against it.
			{/if}
		</p>
		<p class="max-w-3xl text-sm text-gray-400">
			Switch light options with the bar at the bottom (or ← →), and flip to Dark to check both read
			as one brand. The choice holds while you browse the rest of the site: try <a
				class="text-sky-400 underline"
				href="/staff">Staff</a
			>,
			<a class="text-sky-400 underline" href="/roster">Roster</a>,
			<a class="text-sky-400 underline" href="/events">Events</a>,
			<a class="text-sky-400 underline" href="/visit/get-connected">Get connected</a> and
			<a class="text-sky-400 underline" href="/contact">Contact</a>. Local data is empty (and Home
			needs the CMS), so this page carries the table and the form.
		</p>
	</header>

	<!-- Roles -->
	<Panel title="Roles">
		<ul class="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-4">
			{#each swatches as s (s.role)}
				<li class="flex items-center gap-3">
					<span
						class="h-10 w-10 shrink-0 rounded-md border border-slate-600"
						style="background:{s.hex}"
					></span>
					<span class="min-w-0 text-sm">
						<span class="block font-medium text-white">{s.role}</span>
						<span class="block font-mono text-xs text-gray-400">{s.hex} · {s.cls}</span>
					</span>
				</li>
			{/each}
		</ul>
	</Panel>

	<!-- Contrast -->
	<Panel title="Contrast against WCAG 2.2 AA">
		<div class="p-4">
			<p class="mb-3 text-sm text-gray-300">
				{report.length - failing.length} of {report.length} pairings pass. Text needs 4.5:1; input borders
				and focus rings need 3:1. Translucent layers are blended as the browser draws them.
			</p>
			<div class="overflow-x-auto">
				<table class="w-full min-w-[560px] text-sm">
					<thead class="border-b border-slate-600/50 bg-slate-700/50">
						<tr>
							<th class="px-3 py-2 text-left font-medium text-gray-300">Pairing</th>
							<th class="px-3 py-2 text-left font-medium text-gray-300">Sample</th>
							<th class="px-3 py-2 text-right font-medium text-gray-300">Ratio</th>
							<th class="px-3 py-2 text-left font-medium text-gray-300">AA</th>
						</tr>
					</thead>
					<tbody>
						{#each report as r (r.label)}
							<tr class="border-b border-slate-700/30">
								<td class="px-3 py-2">
									<span class="block text-white">{r.label}</span>
									<span class="block font-mono text-xs text-gray-400">{r.role}</span>
								</td>
								<td class="px-3 py-2">
									<span
										class="inline-block rounded px-2 py-1 font-medium"
										style="color:{r.fgHex};background:{r.bgHex};{r.kind === 'control'
											? `box-shadow: inset 0 0 0 2px ${r.fgHex}`
											: ''}"
									>
										{r.kind === 'text' ? 'Aa Sample' : 'Edge'}
									</span>
								</td>
								<td class="px-3 py-2 text-right font-mono text-white">{r.ratio.toFixed(2)}</td>
								<td class="px-3 py-2">
									{#if r.pass}
										<Badge size="sm" color="green" label="Pass" />
									{:else}
										<Badge size="sm" color="red" label="Fail (needs {r.min})" />
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	</Panel>

	<!-- Buttons, badges, alerts -->
	<div class="grid gap-6 lg:grid-cols-2">
		<Panel title="Buttons and links">
			<div class="flex flex-wrap items-center gap-3 p-4">
				<button
					class="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:bg-sky-700 focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-900 focus:outline-none"
					>Primary</button
				>
				<button
					class="rounded-lg border border-slate-600 bg-slate-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-600"
					>Secondary</button
				>
				<button
					class="rounded-lg border border-sky-500/30 bg-sky-600/40 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-500/50"
					>Tinted</button
				>
				<button
					class="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-300 hover:bg-red-500/20"
					>Delete</button
				>
				<a class="text-sm text-sky-400 hover:text-sky-300" href="/prototype/palette">A text link</a>
			</div>
		</Panel>

		<Panel title="Badges">
			<div class="flex flex-wrap gap-2 p-4">
				{#each ['sky', 'green', 'yellow', 'red', 'purple', 'orange', 'blue', 'gray'] as const as color (color)}
					<Badge {color} label={color} />
				{/each}
			</div>
		</Panel>
	</div>

	<Panel title="Alerts">
		<div class="space-y-3 p-4">
			<div class="rounded-lg border border-green-500/30 bg-green-500/20 p-3 text-sm text-green-300">
				Your feedback was sent. Thanks!
			</div>
			<div
				class="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-300"
			>
				You need 50 hours on your current rating before you can visit.
			</div>
			<div class="rounded-lg border border-red-500/30 bg-red-500/20 p-3 text-sm text-red-300">
				Something went wrong saving the event.
			</div>
		</div>
	</Panel>

	<!-- Table -->
	<Panel title="Roster (sample data)">
		<div class="overflow-x-auto">
			<table class="w-full min-w-[560px]">
				<thead class="border-b border-slate-600/50 bg-slate-700/50">
					<tr>
						<th class="px-4 py-3 text-left text-sm font-medium text-gray-300">Controller</th>
						<th class="px-4 py-3 text-left text-sm font-medium text-gray-300">Rating</th>
						<th class="px-4 py-3 text-left text-sm font-medium text-gray-300">Membership</th>
						<th class="px-4 py-3 text-left text-sm font-medium text-gray-300">Roles</th>
					</tr>
				</thead>
				<tbody>
					{#each rows as row (row.cid)}
						<tr class="border-b border-slate-700/30 transition-colors hover:bg-slate-700/30">
							<td class="px-4 py-3">
								<span class="block font-medium text-white">{row.name}</span>
								<span class="block font-mono text-xs text-gray-400">{row.cid}</span>
							</td>
							<td class="px-4 py-3"><Badge size="sm" color="sky" label={row.rating} /></td>
							<td class="px-4 py-3 text-sm text-gray-300">{row.status}</td>
							<td class="px-4 py-3">
								{#each row.roles as role (role)}
									<Badge size="sm" color="purple" label={role} />
								{:else}
									<span class="text-sm text-gray-500">None</span>
								{/each}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<Pagination bind:page={pageNumber} pageCount={4} class="py-3" />
	</Panel>

	<!-- Form -->
	<Panel title="Feedback form (sample)">
		<form class="space-y-4 p-4" onsubmit={(e) => e.preventDefault()}>
			<div>
				<label for="p-name" class="mb-1 block text-sm font-medium text-gray-300">Controller</label>
				<input
					id="p-name"
					class="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-white placeholder-gray-400 transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-500 focus:outline-none"
					placeholder="Search by name or CID"
				/>
			</div>
			<div>
				<label for="p-pos" class="mb-1 block text-sm font-medium text-gray-300">Position</label>
				<select
					id="p-pos"
					class="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500 focus:outline-none"
				>
					<option>IND_CTR</option>
					<option>SDF_APP</option>
				</select>
			</div>
			<div>
				<label for="p-msg" class="mb-1 block text-sm font-medium text-gray-300">Comments</label>
				<textarea
					id="p-msg"
					rows="3"
					class="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-white placeholder-gray-400 transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-500 focus:outline-none"
					placeholder="What went well, and what could be better?"
				></textarea>
				<p class="mt-1 text-sm text-red-400">Comments are required.</p>
			</div>
			<label class="flex items-center gap-2 text-sm text-gray-300">
				<input type="checkbox" class="rounded border-slate-600 bg-slate-700 text-sky-600" checked />
				Share my name with the controller
			</label>
			<div class="flex flex-wrap gap-3">
				<button
					class="rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-700 focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-900 focus:outline-none"
					>Send feedback</button
				>
				<button
					type="button"
					class="rounded-lg border border-slate-600 bg-slate-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-600"
					>Cancel</button
				>
			</div>
		</form>
	</Panel>

	<p class="text-xs text-gray-500">
		Fine print: this site is not affiliated with the FAA. This line is gray-500 on the page.
	</p>
</div>

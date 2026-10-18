<script lang="ts">
	// PROTOTYPE: the floating bar that switches palette candidates. Styled inline
	// with fixed colours so the palette under test never re-colours it.
	import { palettes, contrastReport, type Palette, type Scheme } from './palettes';

	let {
		palette,
		scheme,
		aa,
		onchange
	}: {
		palette: Palette;
		scheme: Scheme;
		aa: boolean;
		onchange: (next: { variant: string; scheme: Scheme; aa: boolean }) => void;
	} = $props();

	const index = $derived(palettes.indexOf(palette));
	const report = $derived(contrastReport(palette, scheme, aa));
	const passing = $derived(report.filter((r) => r.pass).length);

	const set = (next: Partial<{ variant: string; scheme: Scheme; aa: boolean }>) =>
		onchange({ variant: palette.key, scheme, aa, ...next });
	const step = (by: number) =>
		set({ variant: palettes[(index + by + palettes.length) % palettes.length].key });

	function onkeydown(e: KeyboardEvent) {
		const t = e.target as HTMLElement | null;
		if (t?.closest('input, textarea, select, [contenteditable]')) return;
		if (e.key === 'ArrowLeft') step(-1);
		if (e.key === 'ArrowRight') step(1);
	}

	const pill =
		'display:inline-flex;align-items:center;justify-content:center;min-height:36px;padding:0 12px;border-radius:999px;border:1px solid #444;background:#1a1a1a;color:#fff;font:600 13px/1 system-ui,sans-serif;cursor:pointer;white-space:nowrap;';
	const on = 'background:#fff;color:#000;border-color:#fff;';
</script>

<svelte:window {onkeydown} />

<div
	role="toolbar"
	aria-label="Palette prototype"
	style="position:fixed;left:50%;bottom:12px;transform:translateX(-50%);z-index:9999;display:flex;flex-wrap:wrap;justify-content:center;gap:6px;max-width:calc(100vw - 16px);padding:8px;border-radius:20px;background:#000;box-shadow:0 8px 30px rgba(0,0,0,.45);border:2px solid #f0f;"
>
	<button style={pill} onclick={() => step(-1)} aria-label="Previous palette">←</button>
	<span style="{pill}cursor:default;min-width:120px;">{palette.key} · {palette.name}</span>
	<button style={pill} onclick={() => step(1)} aria-label="Next palette">→</button>
	<button
		style="{pill}{scheme === 'light' ? on : ''}"
		onclick={() => set({ scheme: scheme === 'dark' ? 'light' : 'dark' })}
		aria-pressed={scheme === 'light'}>{scheme === 'dark' ? '☾ Dark' : '☀ Light'}</button
	>
	<button style="{pill}{aa ? on : ''}" onclick={() => set({ aa: !aa })} aria-pressed={aa}
		>AA fixes {aa ? 'on' : 'off'}</button
	>
	<a
		style="{pill}text-decoration:none;{passing === report.length
			? 'border-color:#2c2;'
			: 'border-color:#e33;'}"
		href="/prototype/palette?variant={palette.key}&scheme={scheme}&aa={aa ? 1 : 0}"
		>AA {passing}/{report.length}</a
	>
</div>

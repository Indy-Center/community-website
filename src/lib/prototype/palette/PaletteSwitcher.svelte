<script lang="ts">
	// PROTOTYPE: the floating bar that switches palette candidates. Styled inline
	// with fixed colours so the palette under test never re-colours it.
	import { palettes, contrastReport, type Palette, type Scheme } from './palettes';

	let {
		palette,
		scheme,
		onchange
	}: {
		palette: Palette;
		scheme: Scheme;
		onchange: (next: { variant: string; scheme: Scheme }) => void;
	} = $props();

	const index = $derived(palettes.indexOf(palette));
	const report = $derived(contrastReport(palette, scheme));
	const passing = $derived(report.filter((r) => r.pass).length);

	const set = (next: Partial<{ variant: string; scheme: Scheme }>) =>
		onchange({ variant: palette.key, scheme, ...next });
	// Stepping to another light option shows it in light.
	const step = (by: number) =>
		set({
			variant: palettes[(index + by + palettes.length) % palettes.length].key,
			scheme: 'light'
		});

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
	<button style={pill} onclick={() => step(-1)} aria-label="Previous light option">←</button>
	<span style="{pill}cursor:default;min-width:120px;"
		>{scheme === 'light' ? `${palette.key} · ${palette.name}` : 'Dark (settled)'}</span
	>
	<button style={pill} onclick={() => step(1)} aria-label="Next light option">→</button>
	<button
		style="{pill}{scheme === 'light' ? on : ''}"
		onclick={() => set({ scheme: scheme === 'dark' ? 'light' : 'dark' })}
		aria-pressed={scheme === 'light'}>{scheme === 'dark' ? '☾ Dark' : '☀ Light'}</button
	>
	<a
		style="{pill}text-decoration:none;{passing === report.length
			? 'border-color:#2c2;'
			: 'border-color:#e33;'}"
		href="/prototype/palette?variant={palette.key}&scheme={scheme}">AA {passing}/{report.length}</a
	>
</div>

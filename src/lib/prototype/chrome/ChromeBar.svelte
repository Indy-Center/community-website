<script lang="ts">
	// PROTOTYPE (prototype/chrome): the floating bar that switches the chrome's
	// options. Styled inline with fixed colours so the palette never re-colours
	// it. ← → step through the open point's options.
	import { points, variantCode, type PointKey, type Variant } from './chrome';
	import type { Scheme } from '$lib/prototype/palette/palettes';

	type State = { variant: Variant; scheme: Scheme; signedIn: boolean };
	let {
		variant,
		scheme,
		signedIn,
		title,
		onchange,
		height = $bindable(0)
	}: State & { title: string; onchange: (next: State) => void; height?: number } = $props();

	const openPoints = points.filter((p) => !p.decided);
	const decided = points.filter((p) => p.decided);
	let open = $state<PointKey>(openPoints[0].key);
	let collapsed = $state(false);
	const point = $derived(points.find((p) => p.key === open)!);
	const chosen = $derived(point.options.find((o) => o.key === variant[open])!);

	const set = (next: Partial<State>) => onchange({ variant, scheme, signedIn, ...next });
	const pick = (key: string) => set({ variant: { ...variant, [open]: key } });
	const step = (by: number) => {
		const i = point.options.indexOf(chosen);
		pick(point.options[(i + by + point.options.length) % point.options.length].key);
	};

	// Only while focus is in the bar, so arrow keys on the page itself (a
	// keyboard-only test of the chrome) never change the chrome under you.
	let bar: HTMLElement;
	function onkeydown(e: KeyboardEvent) {
		if (!bar.contains(e.target as Node)) return;
		if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
		if (e.key === 'ArrowLeft') step(-1);
		if (e.key === 'ArrowRight') step(1);
	}

	const pill =
		'display:inline-flex;align-items:center;justify-content:center;gap:4px;min-height:32px;padding:0 10px;border-radius:999px;border:1px solid #444;background:#1a1a1a;color:#fff;font:600 12px/1 system-ui,sans-serif;cursor:pointer;white-space:nowrap;';
	const on = 'background:#fff;color:#000;border-color:#fff;';
	const small = 'font:12px/1.35 system-ui,sans-serif;color:#bbb;margin:0;';
</script>

<svelte:window {onkeydown} />

<div
	role="region"
	aria-label="Chrome prototype controls"
	bind:this={bar}
	bind:offsetHeight={height}
	style="position:fixed;left:50%;bottom:8px;transform:translateX(-50%);z-index:9999;width:min(720px,calc(100vw - 16px));padding:8px;border-radius:16px;background:#000;box-shadow:0 8px 30px rgba(0,0,0,.45);border:2px solid #f0f;color:#fff;font:13px/1.3 system-ui,sans-serif;"
>
	<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;">
		<button style={pill} onclick={() => (collapsed = !collapsed)} aria-expanded={!collapsed}
			><span aria-hidden="true">{collapsed ? '▲' : '▼'}</span> Chrome</button
		>
		<code style="{pill}cursor:default;font-family:ui-monospace,monospace;"
			>{variantCode(variant)}</code
		>
		<button
			style="{pill}{scheme === 'light' ? on : ''}"
			aria-pressed={scheme === 'light'}
			onclick={() => set({ scheme: scheme === 'dark' ? 'light' : 'dark' })}
			>{scheme === 'dark' ? '☾ Dark' : '☀ Light'}</button
		>
		<button
			style="{pill}{signedIn ? on : ''}"
			aria-pressed={signedIn}
			onclick={() => set({ signedIn: !signedIn })}>{signedIn ? 'Signed in' : 'Signed out'}</button
		>
		<a style="{pill}text-decoration:none;" href="/prototype/chrome?variant={variantCode(variant)}"
			>About</a
		>
	</div>

	{#if !collapsed}
		<div
			style="display:flex;flex-wrap:wrap;gap:4px;margin-top:8px;"
			role="group"
			aria-label="Point"
		>
			{#each openPoints as p (p.key)}
				<button
					style="{pill}{p.key === open ? on : ''}"
					aria-pressed={p.key === open}
					onclick={() => (open = p.key)}
					>{p.name} <span style="opacity:.6">{variant[p.key]}</span></button
				>
			{/each}
		</div>
		<p style="{small}margin-top:6px;">
			Decided: {decided
				.map((p) => `${p.name} ${p.decided} (${p.options.find((o) => o.key === p.decided)?.name})`)
				.join(' · ')}
		</p>
		<p style="{small}margin-top:8px;">{point.question}</p>
		<div
			style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px;"
			role="group"
			aria-label="{point.name} options"
		>
			{#each point.options as o (o.key)}
				<button
					style="{pill}{o.key === chosen.key ? on : ''}"
					aria-pressed={o.key === chosen.key}
					onclick={() => pick(o.key)}>{o.key} · {o.name}</button
				>
			{/each}
		</div>
		<p style="{small}margin-top:6px;color:#eee;">{chosen.note}</p>
		<p style="{small}margin-top:6px;">Page title: <span style="color:#fff">{title}</span></p>
	{/if}
</div>

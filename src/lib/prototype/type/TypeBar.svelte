<script lang="ts">
	// PROTOTYPE: the floating bar that switches type options, one row per
	// question. Styled inline in a fixed font and size so the options under
	// test never restyle it.
	import { fonts, monos, scales, pick, choiceParams, type TypeChoice, type Scheme } from './type';

	let { choice, onchange }: { choice: TypeChoice; onchange: (next: TypeChoice) => void } = $props();

	const rows = $derived([
		{
			label: 'Font',
			options: fonts,
			current: choice.font,
			set: (key: string) => onchange({ ...choice, font: pick(fonts, key) })
		},
		{
			label: 'Mono',
			options: monos,
			current: choice.mono,
			set: (key: string) => onchange({ ...choice, mono: pick(monos, key) })
		},
		{
			label: 'Scale',
			options: scales,
			current: choice.scale,
			set: (key: string) => onchange({ ...choice, scale: pick(scales, key) })
		}
	]);
	const setScheme = (scheme: Scheme) => onchange({ ...choice, scheme });
	const specimen = $derived(`/prototype/type?${new URLSearchParams(choiceParams(choice))}`);

	const base = 'font:600 13px/1 system-ui,sans-serif;color:#fff;';
	const pill = `${base}display:inline-flex;align-items:center;justify-content:center;min-width:32px;min-height:32px;padding:0 10px;border-radius:999px;border:1px solid #444;background:#1a1a1a;cursor:pointer;white-space:nowrap;text-decoration:none;`;
	const on = 'background:#fff;color:#000;border-color:#fff;';
	const group = 'display:inline-flex;align-items:center;gap:4px;';
	const label = `${base}font-weight:400;color:#aaa;min-width:40px;`;
</script>

<div
	role="toolbar"
	aria-label="Type prototype"
	style="position:fixed;left:50%;bottom:12px;transform:translateX(-50%);z-index:9999;display:flex;flex-wrap:wrap;justify-content:center;gap:6px 14px;width:max-content;max-width:calc(100vw - 16px);padding:8px 12px;border-radius:20px;background:#000;box-shadow:0 8px 30px rgba(0,0,0,.45);border:2px solid #f0f;"
>
	{#each rows as row (row.label)}
		<div style={group} role="group" aria-label={row.label}>
			<span style={label}>{row.label}</span>
			{#each row.options as o (o.key)}
				<button
					style="{pill}{o === row.current ? on : ''}"
					title={o.name}
					aria-label="{row.label} {o.key}: {o.name}"
					aria-pressed={o === row.current}
					onclick={() => row.set(o.key)}>{o.key}</button
				>
			{/each}
		</div>
	{/each}
	<div style={group} role="group" aria-label="Colour scheme">
		<button
			style="{pill}{choice.scheme === 'dark' ? on : ''}"
			aria-pressed={choice.scheme === 'dark'}
			onclick={() => setScheme('dark')}>☾ Dark</button
		>
		<button
			style="{pill}{choice.scheme === 'light' ? on : ''}"
			aria-pressed={choice.scheme === 'light'}
			onclick={() => setScheme('light')}>☀ Light</button
		>
		<a style={pill} href={specimen}>Specimen</a>
	</div>
</div>

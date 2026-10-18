// PROTOTYPE (throwaway, branch prototype/palette): palette candidates for the
// Centerline brand palette ticket. Not for main.
//
// The site colours everything with stock Tailwind classes (slate-800, gray-400,
// sky-600...). Rather than rewrite pages, each candidate redefines the Tailwind
// colour variables those classes read, so every real page re-colours. Each
// class plays a role: gray-900 is the page, slate-800 a card, white the text.
//
// Round 1 settled dark: A, slate (today's colours) with the AA fixes.
// Round 2 (this file): three light options, anchored on that dark palette.

export type Scheme = 'dark' | 'light';
type Scale = Record<string, string>;

const steps = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];
const scale = (hexes: string[]): Scale =>
	Object.fromEntries(steps.map((step, i) => [step, hexes[i]]));

// Tailwind's own values, as hex.
const tw = {
	slate: scale([
		'#f8fafc',
		'#f1f5f9',
		'#e2e8f0',
		'#cbd5e1',
		'#94a3b8',
		'#64748b',
		'#475569',
		'#334155',
		'#1e293b',
		'#0f172a',
		'#020617'
	]),
	gray: scale([
		'#f9fafb',
		'#f3f4f6',
		'#e5e7eb',
		'#d1d5db',
		'#9ca3af',
		'#6b7280',
		'#4b5563',
		'#374151',
		'#1f2937',
		'#111827',
		'#030712'
	]),
	sky: scale([
		'#f0f9ff',
		'#e0f2fe',
		'#bae6fd',
		'#7dd3fc',
		'#38bdf8',
		'#0ea5e9',
		'#0284c7',
		'#0369a1',
		'#075985',
		'#0c4a6e',
		'#082f49'
	]),
	red: scale([
		'#fef2f2',
		'#fee2e2',
		'#fecaca',
		'#fca5a5',
		'#f87171',
		'#ef4444',
		'#dc2626',
		'#b91c1c',
		'#991b1b',
		'#7f1d1d',
		'#450a0a'
	]),
	green: scale([
		'#f0fdf4',
		'#dcfce7',
		'#bbf7d0',
		'#86efac',
		'#4ade80',
		'#22c55e',
		'#16a34a',
		'#15803d',
		'#166534',
		'#14532d',
		'#052e16'
	]),
	yellow: scale([
		'#fefce8',
		'#fef9c3',
		'#fef08a',
		'#fde047',
		'#facc15',
		'#eab308',
		'#ca8a04',
		'#a16207',
		'#854d0e',
		'#713f12',
		'#422006'
	]),
	orange: scale([
		'#fff7ed',
		'#ffedd5',
		'#fed7aa',
		'#fdba74',
		'#fb923c',
		'#f97316',
		'#ea580c',
		'#c2410c',
		'#9a3412',
		'#7c2d12',
		'#431407'
	]),
	purple: scale([
		'#faf5ff',
		'#f3e8ff',
		'#e9d5ff',
		'#d8b4fe',
		'#c084fc',
		'#a855f7',
		'#9333ea',
		'#7e22ce',
		'#6b21a8',
		'#581c87',
		'#3b0764'
	]),
	blue: scale([
		'#eff6ff',
		'#dbeafe',
		'#bfdbfe',
		'#93c5fd',
		'#60a5fa',
		'#3b82f6',
		'#2563eb',
		'#1d4ed8',
		'#1e40af',
		'#1e3a8a',
		'#172554'
	]),
	pink: scale([
		'#fdf2f8',
		'#fce7f3',
		'#fbcfe8',
		'#f9a8d4',
		'#f472b6',
		'#ec4899',
		'#db2777',
		'#be185d',
		'#9d174d',
		'#831843',
		'#500724'
	])
};
const S = tw.slate;
const G = tw.gray;
const NIGHT = '#070f13'; // the brand's black, from the marks

const hues = ['sky', 'red', 'green', 'yellow', 'orange', 'purple', 'blue', 'pink'] as const;

// ---- Dark: settled in round 1 (A with the AA fixes) ----

function darkVars(): Record<string, string> {
	const vars: Record<string, string> = {};
	for (const step of steps) {
		vars[`--color-slate-${step}`] = S[step];
		vars[`--color-gray-${step}`] = G[step];
		vars[`--color-zinc-${step}`] = S[step];
		for (const hue of hues) vars[`--color-${hue}-${step}`] = tw[hue][step];
	}
	vars['--color-white'] = '#ffffff';
	// The AA fixes.
	vars['--color-sky-600'] = tw.sky['700'];
	vars['--color-sky-700'] = tw.sky['800'];
	vars['--color-gray-500'] = G['400'];
	vars['--color-slate-600'] = S['500'];
	vars['--color-zinc-600'] = S['500'];
	vars['--color-placeholder'] = G['300'];
	return vars;
}

// ---- Light: three options for round 2 ----

// Each option says what every dark grey step becomes in light, by its role:
// 900 page · 800 card/header · 700 raised, table head, card border ·
// 600 input border · 500 fine print · 400 muted · 300 soft body text.
type Steps = Record<string, string>;

export type Palette = {
	key: string;
	name: string;
	note: string;
	slate: Steps; // what slate-* classes become
	gray: Steps; // what gray-* classes become
	foreground: string; // what text-white becomes
	darkChrome?: boolean; // header and page heroes keep the dark palette
};

const ink = (s: Scale): Steps => ({
	'300': s['700'],
	'200': s['800'],
	'100': s['900'],
	'50': s['950']
});

export const palettes: Palette[] = [
	{
		key: 'L1',
		name: 'Paper',
		note: 'Quiet and neutral, after Payload’s light theme: an off-white page, white cards with slate-200 edges, slate-900 text. The dark palette’s slate and sky, inverted.',
		slate: {
			'950': '#ffffff',
			'900': S['50'],
			'800': '#ffffff',
			'700': S['200'],
			'600': S['500'],
			'500': G['500'],
			'400': S['600'],
			...ink(S)
		},
		gray: {
			'950': '#ffffff',
			'900': G['50'],
			'800': '#ffffff',
			'700': G['200'],
			'600': S['500'],
			'500': G['500'],
			'400': G['600'],
			...ink(G)
		},
		foreground: S['900']
	},
	{
		key: 'L2',
		name: 'Slate wash, dark header',
		note: 'The header and page heroes stay in the dark palette, so every page still opens on the brand’s slate. Content sits on a cool slate-100 page with white cards.',
		slate: {
			'950': '#ffffff',
			'900': S['100'],
			'800': '#ffffff',
			'700': S['200'],
			'600': S['500'],
			'500': S['600'],
			'400': S['600'],
			...ink(S)
		},
		gray: {
			'950': '#ffffff',
			'900': S['100'],
			'800': '#ffffff',
			'700': S['200'],
			'600': S['500'],
			'500': S['600'],
			'400': S['600'],
			...ink(S)
		},
		foreground: S['900'],
		darkChrome: true
	},
	{
		key: 'L3',
		name: 'Sky and Night',
		note: 'Brighter: a white page, sky-tinted lines and table heads, and text in Night (#070F13), the black of the marks. Leans on the accent for identity.',
		slate: {
			'950': '#ffffff',
			'900': '#ffffff',
			'800': S['50'],
			'700': tw.sky['100'],
			'600': '#5a7180',
			'500': '#5a7180',
			'400': '#4a6070',
			'300': '#1e323d',
			'200': '#13222b',
			'100': '#0b161c',
			'50': NIGHT
		},
		gray: {
			'950': '#ffffff',
			'900': '#ffffff',
			'800': S['50'],
			'700': tw.sky['100'],
			'600': '#5a7180',
			'500': '#5a7180',
			'400': '#4a6070',
			'300': '#1e323d',
			'200': '#13222b',
			'100': '#0b161c',
			'50': NIGHT
		},
		foreground: NIGHT
	}
];

// Light accents: light text tints (200-400) become dark ones.
const lightAccent: Record<string, string> = {
	'50': '900',
	'100': '900',
	'200': '800',
	'300': '800',
	'400': '700',
	'500': '600',
	'600': '600',
	'700': '700',
	'800': '800',
	'900': '900',
	'950': '950'
};

function lightVars(p: Palette): Record<string, string> {
	const vars: Record<string, string> = {};
	for (const step of steps) {
		vars[`--color-slate-${step}`] = p.slate[step];
		vars[`--color-gray-${step}`] = p.gray[step];
		vars[`--color-zinc-${step}`] = p.slate[step];
		for (const hue of hues) vars[`--color-${hue}-${step}`] = tw[hue][lightAccent[step]];
	}
	vars['--color-white'] = p.foreground;
	vars['--color-placeholder'] = p.gray['400'];
	// Buttons as in dark: sky-700, sky-800 on hover.
	vars['--color-sky-600'] = tw.sky['700'];
	vars['--color-sky-700'] = tw.sky['800'];
	return vars;
}

/** The CSS variables a candidate sets, as `--color-<name>-<step>` → hex. */
export function paletteVars(p: Palette, scheme: Scheme): Record<string, string> {
	return scheme === 'dark' ? darkVars() : lightVars(p);
}

const block = (vars: Record<string, string>) =>
	Object.entries(vars)
		.map(([k, v]) => `${k}:${v};`)
		.join('');

// The header (and its mobile menu) and the page heroes.
const chrome = `:is(.bg-slate-800\\/95,.from-slate-700,.bg-slate-800.pt-16)`;
const logoSel = 'svg[aria-label="Indy Center Logo"]';

/** The variables as a stylesheet. */
export function paletteCss(p: Palette, scheme: Scheme): string {
	const css = [`:root{${block(paletteVars(p, scheme))}color-scheme:${scheme};}`];
	css.push(`:root .placeholder-gray-400::placeholder{color:var(--color-placeholder);}`);
	if (scheme === 'light') {
		// Solid accent fills keep white text.
		css.push(
			`:is(.bg-sky-600,.bg-sky-700,.hover\\:bg-sky-700:hover,.bg-red-600,.bg-green-600){--color-white:#ffffff;}`
		);
		// The guide allows only the white or the black logo: black on light.
		css.push(
			`${logoSel}{background:url(/prototype/palette/logo-black.svg) center/contain no-repeat;}${logoSel}>*{visibility:hidden;}`
		);
		if (p.darkChrome) {
			css.push(`${chrome}{${block(darkVars())}color-scheme:dark;}`);
			css.push(`${chrome} ${logoSel}{background:none;}${chrome} ${logoSel}>*{visibility:visible;}`);
		}
	}
	return css.join('');
}

// ---- Contrast (WCAG 2.2) ----

type RGB = [number, number, number];
const hexToRgb = (hex: string): RGB => {
	const n = parseInt(hex.slice(1), 16);
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgbToHex = (c: RGB) =>
	'#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
const over = (fg: RGB, alpha: number, bg: RGB): RGB =>
	[0, 1, 2].map((i) => fg[i] * alpha + bg[i] * (1 - alpha)) as RGB;
const luminance = ([r, g, b]: RGB) => {
	const lin = (v: number) => {
		const c = v / 255;
		return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	};
	return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};
export const contrast = (a: string, b: string) => {
	const [l1, l2] = [luminance(hexToRgb(a)), luminance(hexToRgb(b))].sort((x, y) => y - x);
	return (l1 + 0.05) / (l2 + 0.05);
};

// A colour as the site writes it: "slate-800/60" or "white" or "#ffffff".
// Layers are listed top first and composited down onto the page.
type Pair = {
	label: string;
	role: string;
	fg: string;
	on: string[];
	min: number;
	kind: 'text' | 'control';
	chrome?: boolean; // drawn in the header
};

const page = 'gray-900';
const card = ['slate-800/60', page];
const t = (label: string, role: string, fg: string, on: string[]): Pair => ({
	label,
	role,
	fg,
	on,
	min: 4.5,
	kind: 'text'
});
const c = (label: string, role: string, fg: string, on: string[]): Pair => ({
	label,
	role,
	fg,
	on,
	min: 3,
	kind: 'control'
});

export const pairs: Pair[] = [
	t('Headings on the page', 'foreground / background', 'white', [page]),
	t('Headings in a card', 'foreground / card', 'white', card),
	t('Body text in a card', 'foreground (soft) / card', 'gray-300', card),
	t('Muted text in a card', 'muted-foreground / card', 'slate-400', card),
	t('Muted text on the page', 'muted-foreground / background', 'gray-400', [page]),
	t('Fine print on the page', 'gray-500 / background', 'gray-500', [page]),
	t('Links on the page', 'link / background', 'sky-400', [page]),
	t('Links in a card', 'link / card', 'sky-400', card),
	t('Primary button label', 'primary-foreground / primary', '#ffffff', ['sky-600']),
	t('Primary button, hovered', 'primary-foreground / primary hover', '#ffffff', ['sky-700']),
	t('Sky badge', 'badge text / tint', 'sky-300', ['sky-500/10', ...card]),
	t('Green badge (success)', 'success / tint', 'green-300', ['green-500/10', ...card]),
	t('Yellow badge (warning)', 'warning / tint', 'yellow-300', ['yellow-500/10', ...card]),
	t('Red badge (destructive)', 'destructive / tint', 'red-300', ['red-500/10', ...card]),
	t('Purple badge', 'badge text / tint', 'purple-300', ['purple-500/10', ...card]),
	t('Error message in a card', 'destructive / card', 'red-400', card),
	t('Typed text in an input', 'foreground / input', 'white', ['slate-700', ...card]),
	t('Input placeholder', 'placeholder / input', 'placeholder', ['slate-700', ...card]),
	t('Table header text', 'muted / table head', 'gray-300', ['slate-700/50', ...card]),
	{
		...t('Header nav link', 'foreground (soft) / header', 'gray-300', ['slate-800/95', page]),
		chrome: true
	},
	c('Input border against the card', 'border (input) / card', 'slate-600', card),
	c('Focus ring on the page', 'ring / background', 'sky-500', [page]),
	c('Focus ring in a card', 'ring / card', 'sky-500', card)
];

export type PairResult = Pair & { fgHex: string; bgHex: string; ratio: number; pass: boolean };

export function contrastReport(p: Palette, scheme: Scheme): PairResult[] {
	const main = paletteVars(p, scheme);
	const dark = darkVars();
	return pairs.map((pair) => {
		// The header of a dark-chrome option keeps the dark colours (on a light page).
		const vars = pair.chrome && p.darkChrome && scheme === 'light' ? dark : main;
		const parse = (token: string): { hex: string; alpha: number } => {
			if (token.startsWith('#')) return { hex: token, alpha: 1 };
			const [name, a] = token.split('/');
			const hex = name === 'white' ? vars['--color-white'] : vars[`--color-${name}`];
			return { hex, alpha: a ? Number(a) / 100 : 1 };
		};
		const bottom = pair.on[pair.on.length - 1];
		let rgb = hexToRgb((bottom === page ? main : vars)[`--color-${bottom}`]);
		for (const layer of pair.on.slice(0, -1).reverse()) {
			const { hex, alpha } = parse(layer);
			rgb = over(hexToRgb(hex), alpha, rgb);
		}
		const bgHex = rgbToHex(rgb);
		const fg = parse(pair.fg);
		const fgHex = rgbToHex(over(hexToRgb(fg.hex), fg.alpha, rgb));
		const ratio = contrast(fgHex, bgHex);
		return { ...pair, fgHex, bgHex, ratio, pass: ratio >= pair.min };
	});
}

export const roleSwatches = (p: Palette, scheme: Scheme) => {
	const v = paletteVars(p, scheme);
	return [
		{ role: 'background', cls: 'gray-900', hex: v['--color-gray-900'] },
		{ role: 'card', cls: 'slate-800', hex: v['--color-slate-800'] },
		{ role: 'raised / card border', cls: 'slate-700', hex: v['--color-slate-700'] },
		{ role: 'input border', cls: 'slate-600', hex: v['--color-slate-600'] },
		{ role: 'foreground', cls: 'white', hex: v['--color-white'] },
		{ role: 'foreground (soft)', cls: 'gray-300', hex: v['--color-gray-300'] },
		{ role: 'muted-foreground', cls: 'gray-400', hex: v['--color-gray-400'] },
		{ role: 'primary', cls: 'sky-600', hex: v['--color-sky-600'] },
		{ role: 'link', cls: 'sky-400', hex: v['--color-sky-400'] },
		{ role: 'ring', cls: 'sky-500', hex: v['--color-sky-500'] },
		{ role: 'destructive', cls: 'red-400', hex: v['--color-red-400'] },
		{ role: 'success', cls: 'green-400', hex: v['--color-green-400'] },
		{ role: 'warning', cls: 'yellow-400', hex: v['--color-yellow-400'] }
	];
};

export function readChoice(param: (k: string) => string | null | undefined) {
	const p = palettes.find((x) => x.key === param('variant')) ?? palettes[0];
	// Round 2 is about light, so light is the default.
	const scheme: Scheme = param('scheme') === 'dark' ? 'dark' : 'light';
	return { palette: p, scheme };
}

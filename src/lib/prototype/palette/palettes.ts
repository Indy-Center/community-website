// PROTOTYPE (throwaway, branch prototype/palette): palette candidates for the
// Centerline brand palette ticket. Not for main.
//
// The site colours everything with stock Tailwind classes (slate-800, gray-400,
// sky-600...). Rather than rewrite pages, each candidate redefines the Tailwind
// colour variables those classes read, so every real page re-colours. Each
// class plays a role: gray-900 is the page, slate-800 a card, white the text.
//
// Round 1 settled dark: A, slate (today's colours) with the AA fixes.
// Round 2 offered three light options anchored on that dark palette; round 3
// keeps L1 and L2 and adds two between them (L4 framed, L5 soft).

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

// ---- Light options ----

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
	// The header (with the home page's hero) and the footer can stand apart:
	// 'dark' keeps the dark palette, 'soft' is a slate-200 band.
	chrome?: { header?: Chrome; footer?: Chrome };
};
type Chrome = 'dark' | 'soft';

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
		chrome: { header: 'dark' }
	}
];

// Round 3: between L1 and L2. (L3, Sky and Night, was ruled out.)
palettes.push(
	{
		...palettes[1],
		key: 'L4',
		name: 'Framed: dark header and footer',
		note: 'L2 with the footer in the dark palette too, so the dark reads as a frame around a light page rather than a bar on top of it.',
		chrome: { header: 'dark', footer: 'dark' }
	},
	{
		...palettes[0],
		key: 'L5',
		name: 'In between: soft slate header and footer',
		note: 'L1’s page with the header and footer as a soft slate-200 band: still framed in the brand’s slate, without the jump to dark.',
		chrome: { header: 'soft', footer: 'soft' }
	}
);

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

// The header (and its mobile menu) with the home page's hero; the footer.
const chromeSel = {
	// [data-chrome]: the chrome prototype's header and footer.
	header: `:is([data-chrome="header"],.bg-slate-800\\/95,.from-slate-700,.bg-slate-800.pt-16)`,
	footer: `:is([data-chrome="footer"],footer.bg-gray-900)`
};
const logoSel = 'svg[aria-label="Indy Center Logo"]';

/** What a header or footer of the given kind sets, on top of the light vars. */
function chromeVars(p: Palette, kind: Chrome): Record<string, string> {
	if (kind === 'dark') return darkVars();
	return {
		...lightVars(p),
		'--color-slate-800': S['200'], // header band
		'--color-gray-900': S['200'], // footer band
		'--color-slate-700': S['300'],
		'--color-slate-600': S['400'],
		'--color-gray-500': G['600'] // fine print on the band
	};
}

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
		for (const part of ['header', 'footer'] as const) {
			const kind = p.chrome?.[part];
			if (!kind) continue;
			const sel = chromeSel[part];
			css.push(
				`${sel}{${block(chromeVars(p, kind))}color-scheme:${kind === 'dark' ? 'dark' : 'light'};}`
			);
			if (kind === 'dark')
				css.push(`${sel} ${logoSel}{background:none;}${sel} ${logoSel}>*{visibility:visible;}`);
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
	chrome?: 'header' | 'footer'; // drawn in the header or footer
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
		chrome: 'header'
	},
	{ ...t('Footer text', 'muted / footer', 'gray-400', [page]), chrome: 'footer' },
	{ ...t('Footer fine print', 'gray-500 / footer', 'gray-500', [page]), chrome: 'footer' },
	c('Input border against the card', 'border (input) / card', 'slate-600', card),
	c('Focus ring on the page', 'ring / background', 'sky-500', [page]),
	c('Focus ring in a card', 'ring / card', 'sky-500', card)
];

export type PairResult = Pair & { fgHex: string; bgHex: string; ratio: number; pass: boolean };

export function contrastReport(p: Palette, scheme: Scheme): PairResult[] {
	const main = paletteVars(p, scheme);
	return pairs.map((pair) => {
		// A header or footer that stands apart uses its own colours.
		const kind = scheme === 'light' && pair.chrome ? p.chrome?.[pair.chrome] : undefined;
		const vars = kind ? chromeVars(p, kind) : main;
		const parse = (token: string): { hex: string; alpha: number } => {
			if (token.startsWith('#')) return { hex: token, alpha: 1 };
			const [name, a] = token.split('/');
			const hex = name === 'white' ? vars['--color-white'] : vars[`--color-${name}`];
			return { hex, alpha: a ? Number(a) / 100 : 1 };
		};
		const bottom = pair.on[pair.on.length - 1];
		// The translucent header sits over the page; the footer is its own fill.
		const base = pair.chrome === 'footer' ? vars : main;
		let rgb = hexToRgb(base[`--color-${bottom}`]);
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
	// These rounds are about light, so light is the default.
	const scheme: Scheme = param('scheme') === 'dark' ? 'dark' : 'light';
	return { palette: p, scheme };
}

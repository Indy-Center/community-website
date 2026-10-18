// PROTOTYPE (throwaway, branch prototype/palette): palette candidates for the
// Centerline brand palette ticket. Not for main.
//
// The site colours everything with stock Tailwind classes (slate-800, gray-400,
// sky-600...). Rather than rewrite pages, each candidate redefines the Tailwind
// colour variables those classes read, so every real page re-colours. Each
// class plays a role: gray-900 is the page, slate-800 a card, white the text.
// The light scheme maps each role to its light value (Payload's light theme is
// the starting point: gray-50 page, white cards, slate-200 borders, slate-900
// text, sky-600 buttons, sky-700 links).

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
	zinc: scale([
		'#fafafa',
		'#f4f4f5',
		'#e4e4e7',
		'#d4d4d8',
		'#a1a1aa',
		'#71717a',
		'#52525b',
		'#3f3f46',
		'#27272a',
		'#18181b',
		'#09090b'
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

// Greys tinted toward the brand's Night (#070F13, the black of the marks).
const night = scale([
	'#f7f9fa',
	'#eef2f5',
	'#dce4e9',
	'#bac8d0',
	'#8da0ac',
	'#5a7180',
	'#2e4654',
	'#1e323d',
	'#13222b',
	'#0b161c',
	'#070f13'
]);

export type Palette = {
	key: string;
	name: string;
	note: string;
	slate: Scale; // what the site's slate-* classes become
	gray: Scale; // what the site's gray-* classes become
};

export const palettes: Palette[] = [
	{
		key: 'A',
		name: 'Slate (today)',
		note: 'Today’s colours: slate surfaces on a gray page, sky accent.',
		slate: tw.slate,
		gray: tw.gray
	},
	{
		key: 'B',
		name: 'Zinc',
		note: 'Neutral zinc greys, as indy-library and the charts use. slate and gray become one scale.',
		slate: tw.zinc,
		gray: tw.zinc
	},
	{
		key: 'C',
		name: 'Night',
		note: 'Blue-black greys built from the brand’s Night (#070F13). slate and gray become one scale.',
		slate: night,
		gray: night
	}
];

const hues = ['sky', 'red', 'green', 'yellow', 'orange', 'purple', 'blue', 'pink'] as const;

// Light scheme: the colour each dark-scheme grey step becomes, by role.
const lightGrey: Record<string, string> = {
	'950': 'white',
	'900': '50', // page
	'800': 'white', // cards, header
	'700': '200', // raised surfaces, table heads, card borders
	'600': '300', // input borders, secondary buttons
	'500': '500', // fine print
	'400': '600', // muted text
	'300': '700', // soft text
	'200': '800',
	'100': '900',
	'50': '950'
};

// Light scheme: accents. Light text tints (200-400) become dark ones.
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

/**
 * The CSS variables a candidate sets, as `--color-<name>-<step>` → hex.
 * `aa` applies the fixes for today's AA failures: sky-700 buttons, fine print
 * one step stronger, and input borders that stand out from the card.
 */
export function paletteVars(p: Palette, scheme: Scheme, aa: boolean): Record<string, string> {
	const vars: Record<string, string> = {};
	const pick = (s: Scale, step: string) => (step === 'white' ? '#ffffff' : s[step]);

	for (const step of steps) {
		if (scheme === 'dark') {
			vars[`--color-slate-${step}`] = p.slate[step];
			vars[`--color-gray-${step}`] = p.gray[step];
		} else {
			vars[`--color-slate-${step}`] = pick(p.slate, lightGrey[step]);
			vars[`--color-gray-${step}`] = pick(p.gray, lightGrey[step]);
		}
		for (const hue of hues) {
			vars[`--color-${hue}-${step}`] =
				scheme === 'dark' ? tw[hue][step] : tw[hue][lightAccent[step]];
		}
	}
	// zinc is used by a few elements already; keep it on the palette's greys too.
	for (const step of steps) vars[`--color-zinc-${step}`] = vars[`--color-slate-${step}`];

	// text-white is the foreground: white on dark, the darkest text grey on light.
	vars['--color-white'] = scheme === 'dark' ? '#ffffff' : p.slate['900'];
	vars['--color-placeholder'] = vars['--color-gray-400'];

	if (aa) {
		vars['--color-sky-600'] = tw.sky['700'];
		vars['--color-sky-700'] = tw.sky['800'];
		if (scheme === 'dark') vars['--color-gray-500'] = p.gray['400'];
		// Placeholders sit on the input fill, a step lighter than the card.
		if (scheme === 'dark') vars['--color-placeholder'] = p.gray['300'];
		vars['--color-slate-600'] = p.slate['500'];
		vars['--color-zinc-600'] = p.slate['500'];
	}
	return vars;
}

/** The variables as a stylesheet. Solid accent fills keep white text on light. */
export function paletteCss(p: Palette, scheme: Scheme, aa: boolean): string {
	const vars = paletteVars(p, scheme, aa);
	const body = Object.entries(vars)
		.map(([k, v]) => `${k}:${v};`)
		.join('');
	const onFill =
		scheme === 'light'
			? `:is(.bg-sky-600,.bg-sky-700,.hover\\:bg-sky-700:hover,.bg-red-600,.bg-green-600){--color-white:#ffffff;}`
			: '';
	const placeholder = `:root .placeholder-gray-400::placeholder{color:var(--color-placeholder);}`;
	// The guide allows only the white or the black logo: black on light.
	const logo =
		scheme === 'light'
			? `svg[aria-label="Indy Center Logo"]{background:url(/prototype/palette/logo-black.svg) center/contain no-repeat;}svg[aria-label="Indy Center Logo"]>*{visibility:hidden;}`
			: '';
	return `:root{${body}color-scheme:${scheme};}${onFill}${placeholder}${logo}`;
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
};

const page = 'gray-900';
const card = ['slate-800/60', page];

export const pairs: Pair[] = [
	{
		label: 'Headings on the page',
		role: 'foreground / background',
		fg: 'white',
		on: [page],
		min: 4.5,
		kind: 'text'
	},
	{
		label: 'Headings in a card',
		role: 'foreground / card',
		fg: 'white',
		on: card,
		min: 4.5,
		kind: 'text'
	},
	{
		label: 'Body text in a card',
		role: 'foreground (soft) / card',
		fg: 'gray-300',
		on: card,
		min: 4.5,
		kind: 'text'
	},
	{
		label: 'Muted text in a card',
		role: 'muted-foreground / card',
		fg: 'slate-400',
		on: card,
		min: 4.5,
		kind: 'text'
	},
	{
		label: 'Muted text on the page',
		role: 'muted-foreground / background',
		fg: 'gray-400',
		on: [page],
		min: 4.5,
		kind: 'text'
	},
	{
		label: 'Fine print on the page',
		role: 'gray-500 / background',
		fg: 'gray-500',
		on: [page],
		min: 4.5,
		kind: 'text'
	},
	{
		label: 'Links on the page',
		role: 'link / background',
		fg: 'sky-400',
		on: [page],
		min: 4.5,
		kind: 'text'
	},
	{
		label: 'Links in a card',
		role: 'link / card',
		fg: 'sky-400',
		on: card,
		min: 4.5,
		kind: 'text'
	},
	{
		label: 'Primary button label',
		role: 'primary-foreground / primary',
		fg: '#ffffff',
		on: ['sky-600'],
		min: 4.5,
		kind: 'text'
	},
	{
		label: 'Primary button, hovered',
		role: 'primary-foreground / primary hover',
		fg: '#ffffff',
		on: ['sky-700'],
		min: 4.5,
		kind: 'text'
	},
	{
		label: 'Current page in pagination',
		role: 'primary-foreground / primary',
		fg: '#ffffff',
		on: ['sky-600'],
		min: 4.5,
		kind: 'text'
	},
	{
		label: 'Sky badge',
		role: 'badge text / tint',
		fg: 'sky-300',
		on: ['sky-500/10', ...card],
		min: 4.5,
		kind: 'text'
	},
	{
		label: 'Green badge (success)',
		role: 'success / tint',
		fg: 'green-300',
		on: ['green-500/10', ...card],
		min: 4.5,
		kind: 'text'
	},
	{
		label: 'Yellow badge (warning)',
		role: 'warning / tint',
		fg: 'yellow-300',
		on: ['yellow-500/10', ...card],
		min: 4.5,
		kind: 'text'
	},
	{
		label: 'Red badge (destructive)',
		role: 'destructive / tint',
		fg: 'red-300',
		on: ['red-500/10', ...card],
		min: 4.5,
		kind: 'text'
	},
	{
		label: 'Purple badge',
		role: 'badge text / tint',
		fg: 'purple-300',
		on: ['purple-500/10', ...card],
		min: 4.5,
		kind: 'text'
	},
	{
		label: 'Error message in a card',
		role: 'destructive / card',
		fg: 'red-400',
		on: card,
		min: 4.5,
		kind: 'text'
	},
	{
		label: 'Typed text in an input',
		role: 'foreground / input',
		fg: 'white',
		on: ['slate-700', ...card],
		min: 4.5,
		kind: 'text'
	},
	{
		label: 'Input placeholder',
		role: 'placeholder / input',
		fg: 'placeholder',
		on: ['slate-700', ...card],
		min: 4.5,
		kind: 'text'
	},
	{
		label: 'Table header text',
		role: 'muted / table head',
		fg: 'gray-300',
		on: ['slate-700/50', ...card],
		min: 4.5,
		kind: 'text'
	},
	{
		label: 'Header nav link',
		role: 'foreground (soft) / header',
		fg: 'gray-300',
		on: ['slate-800/95', page],
		min: 4.5,
		kind: 'text'
	},
	{
		label: 'Input border against the card',
		role: 'border (input) / card',
		fg: 'slate-600',
		on: card,
		min: 3,
		kind: 'control'
	},
	{
		label: 'Focus ring on the page',
		role: 'ring / background',
		fg: 'sky-500',
		on: [page],
		min: 3,
		kind: 'control'
	},
	{
		label: 'Focus ring in a card',
		role: 'ring / card',
		fg: 'sky-500',
		on: card,
		min: 3,
		kind: 'control'
	}
];

export type PairResult = Pair & { fgHex: string; bgHex: string; ratio: number; pass: boolean };

export function contrastReport(p: Palette, scheme: Scheme, aa: boolean): PairResult[] {
	const vars = paletteVars(p, scheme, aa);
	const parse = (token: string): { hex: string; alpha: number } => {
		if (token.startsWith('#')) return { hex: token, alpha: 1 };
		const [name, a] = token.split('/');
		const hex = name === 'white' ? vars['--color-white'] : vars[`--color-${name}`];
		return { hex, alpha: a ? Number(a) / 100 : 1 };
	};
	const flatten = (layers: string[]): RGB => {
		const bottom = layers[layers.length - 1];
		let rgb = hexToRgb(parse(bottom).hex);
		for (const layer of layers.slice(0, -1).reverse()) {
			const { hex, alpha } = parse(layer);
			rgb = over(hexToRgb(hex), alpha, rgb);
		}
		return rgb;
	};
	return pairs.map((pair) => {
		const bgHex = rgbToHex(flatten(pair.on));
		const fg = parse(pair.fg);
		const fgHex = rgbToHex(over(hexToRgb(fg.hex), fg.alpha, hexToRgb(bgHex)));
		const ratio = contrast(fgHex, bgHex);
		return { ...pair, fgHex, bgHex, ratio, pass: ratio >= pair.min };
	});
}

export const roleSwatches = (p: Palette, scheme: Scheme, aa: boolean) => {
	const v = paletteVars(p, scheme, aa);
	return [
		{ role: 'background', cls: 'gray-900', hex: v['--color-gray-900'] },
		{ role: 'card', cls: 'slate-800', hex: v['--color-slate-800'] },
		{ role: 'raised / input', cls: 'slate-700', hex: v['--color-slate-700'] },
		{ role: 'border', cls: 'slate-600', hex: v['--color-slate-600'] },
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
	const scheme: Scheme = param('scheme') === 'light' ? 'light' : 'dark';
	const aa = param('aa') === '1';
	return { palette: p, scheme, aa };
}

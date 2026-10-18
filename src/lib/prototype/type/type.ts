// PROTOTYPE (throwaway, branch prototype/type): type options for the
// Centerline type ticket. Not for main.
//
// The site sets type with stock Tailwind classes (text-sm, text-3xl,
// font-mono...). As the palette prototype did with colours, each option
// redefines the Tailwind variables those classes read, so every real page
// changes with no page edits. Fonts and the scale are separate questions,
// each with its own URL parameter: ?font=B&mono=A&scale=C&scheme=light.

export type Scheme = 'dark' | 'light';

// Tailwind's own stacks: what the apps use today.
export const systemSans =
	"ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'";
export const systemMono =
	"ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";

const sourceSans = `'Source Sans 3', ${systemSans}`;
const sourceCode = `'Source Code Pro', ${systemMono}`;

/** A self-hosted webfont file: the Latin subset of a variable font (every weight). */
export type FontFile = { family: string; style: 'normal' | 'italic'; url: string; kb: number };

const files = {
	sans: {
		family: 'Source Sans 3',
		style: 'normal',
		url: '/prototype/type/source-sans-3-latin.woff2',
		kb: 28.9
	},
	sansItalic: {
		family: 'Source Sans 3',
		style: 'italic',
		url: '/prototype/type/source-sans-3-latin-italic.woff2',
		kb: 28.5
	},
	code: {
		family: 'Source Code Pro',
		style: 'normal',
		url: '/prototype/type/source-code-pro-latin.woff2',
		kb: 22.0
	}
} satisfies Record<string, FontFile>;

type Option = { key: string; name: string; note: string };

export type FontOption = Option & { body: string; headings: string; files: FontFile[] };

export const fonts: FontOption[] = [
	{
		key: 'A',
		name: 'System (today)',
		note: 'Each device’s own sans-serif: San Francisco on Apple, Segoe UI on Windows, Roboto on Android. Nothing to download; looks different on each device.',
		body: systemSans,
		headings: systemSans,
		files: []
	},
	{
		key: 'B',
		name: 'Source Sans 3',
		note: 'The logo’s font for everything, so the site and the logo read as one. The same on every device.',
		body: sourceSans,
		headings: sourceSans,
		files: [files.sans, files.sansItalic]
	},
	{
		key: 'C',
		name: 'Source Sans 3 headings, system body',
		note: 'The logo’s font where it shows most (headings, labels), the device’s font for running text. Half the download of B; body text looks native.',
		body: systemSans,
		headings: sourceSans,
		files: [files.sans]
	}
];

export type MonoOption = Option & { family: string; files: FontFile[] };

export const monos: MonoOption[] = [
	{
		key: 'A',
		name: 'System mono (today)',
		note: 'The device’s monospaced font: SF Mono, Consolas, Menlo.',
		family: systemMono,
		files: []
	},
	{
		key: 'B',
		name: 'Source Code Pro',
		note: 'Source Sans 3’s monospaced sibling, drawn to sit beside it.',
		family: sourceCode,
		files: [files.code]
	},
	{
		key: 'C',
		name: 'Body font, tabular figures',
		note: 'No monospaced font: CIDs and ratings use the body font with equal-width digits, so columns still line up.',
		family: 'var(--font-sans)',
		files: []
	}
];

// Tailwind's size names, smallest first. `base` is body text.
export const steps = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl'] as const;
export type Step = (typeof steps)[number];
export type Size = { px: number; lineHeight: number };

export type ScaleOption = Option & { sizes: Record<Step, Size> };

// Tailwind's defaults, as px and line-height (unitless).
const tailwind: Record<Step, Size> = {
	xs: { px: 12, lineHeight: 16 / 12 },
	sm: { px: 14, lineHeight: 20 / 14 },
	base: { px: 16, lineHeight: 1.5 },
	lg: { px: 18, lineHeight: 28 / 18 },
	xl: { px: 20, lineHeight: 28 / 20 },
	'2xl': { px: 24, lineHeight: 32 / 24 },
	'3xl': { px: 30, lineHeight: 36 / 30 },
	'4xl': { px: 36, lineHeight: 40 / 36 },
	'5xl': { px: 48, lineHeight: 1 },
	'6xl': { px: 60, lineHeight: 1 }
};

// Line height loosens for small text and tightens for large, on a 4px grid.
const leading = (px: number) => {
	const factor = px < 20 ? 1.5 : px < 28 ? 1.35 : px < 40 ? 1.2 : 1.1;
	return Math.ceil((px * factor) / 4) * 4;
};

/**
 * A modular scale: each step `ratio` times the last, from 16px body text.
 * xs and sm stay at 12 and 14px so fine print never gets smaller than today.
 */
export function modular(ratio: number): Record<Step, Size> {
	return Object.fromEntries(
		steps.map((step, i) => {
			const exact = 16 * ratio ** (i - 2);
			const px = step === 'xs' ? 12 : step === 'sm' ? 14 : Math.round(exact);
			return [step, { px, lineHeight: leading(px) / px }];
		})
	) as Record<Step, Size>;
}

export const scales: ScaleOption[] = [
	{
		key: 'A',
		name: 'Tailwind default (today)',
		note: 'The sizes the site uses now: 16px body, big jumps at the top (36, 48, 60).',
		sizes: tailwind
	},
	{
		key: 'B',
		name: 'Minor third (×1.2)',
		note: 'Each step 1.2× the last. Headings a little smaller and closer together: calmer, suits dense app screens.',
		sizes: modular(1.2)
	},
	{
		key: 'C',
		name: 'Major third (×1.25)',
		note: 'Each step 1.25× the last. Clearer jumps between heading levels; large headings grow.',
		sizes: modular(1.25)
	}
];

export type TypeChoice = {
	font: FontOption;
	mono: MonoOption;
	scale: ScaleOption;
	scheme: Scheme;
};

const pick = <T extends Option>(list: T[], key: string | null | undefined) =>
	list.find((o) => o.key === key) ?? list[0];

/** Reads a choice from named parameters; anything missing or unknown is today's. */
export function readChoice(param: (k: string) => string | null | undefined): TypeChoice {
	return {
		font: pick(fonts, param('font')),
		mono: pick(monos, param('mono')),
		scale: pick(scales, param('scale')),
		scheme: param('scheme') === 'light' ? 'light' : 'dark'
	};
}

export const choiceParams = (c: TypeChoice) => ({
	font: c.font.key,
	mono: c.mono.key,
	scale: c.scale.key,
	scheme: c.scheme
});

/** The webfont files a choice loads. */
export const filesFor = (c: TypeChoice) => [...c.font.files, ...c.mono.files];

const rem = (px: number) => `${+(px / 16).toFixed(4)}rem`;

/** CSS that applies a choice over the whole site. */
export function typeCss(c: TypeChoice): string {
	const faces = filesFor(c).map(
		(f) =>
			`@font-face{font-family:'${f.family}';font-style:${f.style};font-weight:200 900;font-display:swap;src:url(${f.url}) format('woff2');}`
	);
	const sizes = steps.flatMap((s) => {
		const { px, lineHeight } = c.scale.sizes[s];
		return [`--text-${s}:${rem(px)};`, `--text-${s}--line-height:${+lineHeight.toFixed(4)};`];
	});
	return [
		...faces,
		`:root{--font-sans:${c.font.body};--font-heading:${c.font.headings};--font-mono:${c.mono.family};${sizes.join('')}}`,
		`:is(h1,h2,h3,h4,h5,h6){font-family:var(--font-heading);}`,
		// Equal-width digits wherever CIDs and ratings are set.
		`.font-mono{font-variant-numeric:tabular-nums;}`
	].join('\n');
}

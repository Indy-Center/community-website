// PROTOTYPE (throwaway, branch prototype/chrome): the Centerline chrome
// prototype (design-system ticket 03). Not for main.
//
// Six points to decide, each with two or three options. `?variant=` holds one
// letter per point, in this order, so `?variant=BACAAB` is header B, apps A...
// The settled palette (dark A, light L4 "framed") is pinned underneath.

export type PointKey = 'header' | 'apps' | 'nav' | 'user' | 'footer' | 'touch';
type Option = { key: string; name: string; note: string };
type Point = { key: PointKey; name: string; question: string; options: Option[] };

export const points: Point[] = [
	{
		key: 'header',
		name: 'Header',
		question: 'Where the mark or logo leads, and where the app’s name leads.',
		options: [
			{
				key: 'A',
				name: 'Logo, then app name',
				note: 'The full logo goes to the hub; a divider, then the app’s name goes to the app’s home.'
			},
			{
				key: 'B',
				name: 'Mark, then app name',
				note: 'The square mark goes to the hub; the app’s name beside it goes to the app’s home. Narrower on phones.'
			},
			{
				key: 'C',
				name: 'One lockup to the app’s home',
				note: 'Logo and name are one link to the app’s home. The hub is reached only from the menu of apps.'
			}
		]
	},
	{
		key: 'apps',
		name: 'Menu of apps',
		question: 'How a member moves between apps, with the current one marked.',
		options: [
			{
				key: 'A',
				name: 'Apps button',
				note: 'A grid button at the right of the header opens the list of apps. The same on phones.'
			},
			{
				key: 'B',
				name: 'Strip above the header',
				note: 'A thin bar of every app sits above the header, always visible. Scrolls sideways on phones.'
			},
			{
				key: 'C',
				name: 'Switcher beside the app name',
				note: 'A chevron next to the app’s name opens the list. The name itself still goes to the app’s home.'
			}
		]
	},
	{
		key: 'nav',
		name: 'App navigation',
		question: 'An app’s own navigation, and how deep it may go.',
		options: [
			{
				key: 'A',
				name: 'One level of groups',
				note: 'Today’s site: top-level links and dropdown groups, never a group inside a group.'
			},
			{
				key: 'B',
				name: 'Flat',
				note: 'Every page is a top-level link. No dropdowns at all; an app with too many pages has to cut.'
			},
			{
				key: 'C',
				name: 'Groups as section tabs',
				note: 'The header lists sections; a section’s pages show as tabs under the header. Two levels, nothing hidden in a dropdown.'
			}
		]
	},
	{
		key: 'user',
		name: 'User menu',
		question: 'What every app shows, and what an app may add.',
		options: [
			{
				key: 'A',
				name: 'Name and ratings, app section',
				note: 'Today’s button (name and rating chips). The menu: who you are, the shared items, then a section for this app’s own items.'
			},
			{
				key: 'B',
				name: 'Compact button, app section',
				note: 'The same menu behind a small round button with your initials, so the header has more room.'
			},
			{
				key: 'C',
				name: 'Shared items only',
				note: 'Compact button; the menu holds only what every app shows. An app’s own items, such as its admin, go in its navigation.'
			}
		]
	},
	{
		key: 'footer',
		name: 'Footer',
		question: 'The footer with the disclaimer.',
		options: [
			{ key: 'A', name: 'Disclaimer only', note: 'Today’s footer: the disclaimer and copyright.' },
			{
				key: 'B',
				name: 'Disclaimer and policy links',
				note: 'One row of links (privacy, accessibility, community policy, contact) above the disclaimer.'
			},
			{
				key: 'C',
				name: 'Small map',
				note: 'Columns of what people most often look for: the apps, help, and the policies. Then the disclaimer.'
			}
		]
	},
	{
		key: 'touch',
		name: 'Touch size',
		question: 'The smallest height of the chrome’s controls and menu items.',
		options: [
			{
				key: 'A',
				name: '36px (about today)',
				note: 'Close to today’s header buttons and menu rows.'
			},
			{
				key: 'B',
				name: '44px',
				note: 'Apple’s minimum touch target, and WCAG’s enhanced (AAA) size.'
			},
			{ key: 'C', name: '48px', note: 'Android’s Material minimum.' }
		]
	}
];

export type Variant = Record<PointKey, string>;

/** Reads a code such as `BACAAB`; a missing or unknown letter falls back to A. */
export function parseVariant(code: string | null | undefined): Variant {
	const letters = (code ?? '').toUpperCase();
	return Object.fromEntries(
		points.map((p, i) => {
			const letter = letters[i];
			return [p.key, p.options.some((o) => o.key === letter) ? letter : 'A'];
		})
	) as Variant;
}

export const variantCode = (v: Variant) => points.map((p) => v[p.key]).join('');

export const touchPx: Record<string, number> = { A: 36, B: 44, C: 48 };

// ---- Apps ----

export type AppKey = 'hub' | 'training' | 'library';

export type AppEntry = {
	key: AppKey | 'charts' | 'tools';
	name: string;
	what: string;
	home: string;
	/** Outside this prototype: a link to the live site. */
	live?: boolean;
};

const MOCK = '/prototype/chrome';

export const apps: AppEntry[] = [
	{ key: 'hub', name: 'Indy Center', what: 'Events, roster, staff, feedback', home: '/' },
	{
		key: 'training',
		name: 'Training',
		what: 'Your training, sessions, certifications',
		home: `${MOCK}/training`
	},
	{
		key: 'library',
		name: 'Library',
		what: 'Courses for pilots and controllers',
		home: `${MOCK}/library`
	},
	{
		key: 'charts',
		name: 'Charts',
		what: 'Airport charts for your session',
		home: 'https://charts.flyindycenter.com',
		live: true
	},
	{
		key: 'tools',
		name: 'Controller Tools',
		what: 'Its own brand, run by the tools team',
		home: 'https://tools.flyindycenter.com',
		live: true
	}
];

export const appByKey = (key: AppKey) => apps.find((a) => a.key === key)!;

/** Which app a path belongs to: the mock apps live under /prototype/chrome. */
export function appForPath(pathname: string): AppKey {
	for (const key of ['training', 'library'] as const) {
		const home = appByKey(key).home;
		if (pathname === home || pathname.startsWith(home + '/')) return key;
	}
	return 'hub';
}

// ---- Each app's own navigation ----

export type NavLink = { label: string; href: string; icon: string };
export type NavGroup = { label: string; icon: string; children: NavLink[] };
export type NavItem = NavLink | NavGroup;
export const isGroup = (i: NavItem): i is NavGroup => 'children' in i;

const t = (p: string) => `${MOCK}/training${p}`;
const l = (p: string) => `${MOCK}/library${p}`;

// The hub's today, without the links out to other apps (the menu of apps has
// them now) and with the wiki's "Library" gone.
export const navs: Record<AppKey, NavItem[]> = {
	hub: [
		{ label: 'Home', href: '/', icon: 'home' },
		{ label: 'Events', href: '/events', icon: 'calendar' },
		{
			label: 'Controlling',
			icon: 'headset',
			children: [
				{ label: 'Roster', href: '/roster', icon: 'roster' },
				{ label: 'Join Indy Center', href: '/visit', icon: 'join' }
			]
		},
		{
			label: 'Flying',
			icon: 'airplane',
			children: [{ label: 'Feedback', href: '/feedback', icon: 'feedback' }]
		},
		{
			label: 'About',
			icon: 'info',
			children: [
				{ label: 'Staff', href: '/staff', icon: 'staff' },
				{ label: 'Partners', href: '/partners', icon: 'partners' },
				{ label: 'Contact Us', href: '/contact', icon: 'contact' }
			]
		}
	],
	// training-tools today, minus its "Home" that leads to the hub.
	training: [
		{ label: 'My Training', href: t('/dashboard'), icon: 'school' },
		{
			label: 'Teach',
			icon: 'teach',
			children: [
				{ label: 'My Students', href: t('/teach'), icon: 'roster' },
				{ label: 'Sessions', href: t('/teach/sessions'), icon: 'calendar' }
			]
		},
		{ label: 'Waitlist', href: t('/waitlist'), icon: 'waitlist' },
		{
			label: 'Records',
			icon: 'records',
			children: [
				{ label: 'Certifications', href: t('/certifications'), icon: 'certificate' },
				{ label: 'Teachers', href: t('/teachers'), icon: 'staff' }
			]
		}
	],
	// indy-library today.
	library: [
		{ label: 'Courses', href: l(''), icon: 'book' },
		{ label: 'Competencies', href: l('/competencies'), icon: 'records' }
	]
};

/** What an app adds to the user menu (or, in user menu C, to its navigation). */
export const appExtras: Record<AppKey, NavLink[]> = {
	hub: [{ label: 'Admin', href: '/admin', icon: 'admin' }],
	training: [{ label: 'Training admin', href: t('/admin'), icon: 'admin' }],
	library: [{ label: 'Manage courses', href: l('/manage'), icon: 'admin' }]
};

/** Flattens groups into their pages. */
export const navLinks = (items: NavItem[]): NavLink[] =>
	items.flatMap((i) => (isGroup(i) ? i.children : [i]));

/** True when `href` is the current page or a page under it (the app's home only matches itself). */
export function isCurrent(pathname: string, href: string, home: string) {
	if (href === home) return pathname === home;
	return pathname === href || pathname.startsWith(href + '/');
}

/** The deepest nav link the path falls under. */
export function currentLink(pathname: string, links: NavLink[], home: string) {
	return links
		.filter((x) => isCurrent(pathname, x.href, home))
		.sort((a, b) => b.href.length - a.href.length)[0];
}

// ---- Mock pages for training and the library ----

export type MockPage = { title: string; intro: string };

export function mockPage(app: AppKey, path: string): MockPage | undefined {
	const home = appByKey(app).home;
	const href = path ? `${home}/${path}` : home;
	if (app === 'training' && !path)
		return {
			title: 'Training',
			intro:
				'Training’s home. Enrol, see where you are in your training and book sessions with your teacher.'
		};
	const link = [...navLinks(navs[app]), ...appExtras[app]].find((x) => x.href === href);
	if (!link) return undefined;
	return {
		title: link.label,
		intro: `A stand-in for ${appByKey(app).name}’s ${link.label} page, there so the chrome can be tried. Its content is not part of the prototype.`
	};
}

// ---- Page titles (spec: page first) ----

/** `<Page> | Indy Center` on the hub, `<Page> | <App> | Indy Center` elsewhere. */
export function pageTitle(page: string, app: AppKey) {
	if (app === 'hub') return page === 'Indy Center' ? page : `${page} | Indy Center`;
	const name = appByKey(app).name;
	return page === name ? `${name} | Indy Center` : `${page} | ${name} | Indy Center`;
}

/** Rewrites the site's old titles (`Indy Center | Events`, `Admin - Indy Center`) page first. */
export function pageFirst(title: string) {
	const old = title.match(/^Indy Center \| (.+)$/);
	if (old) return old[1] === 'Welcome to Indy' ? 'Indy Center' : `${old[1]} | Indy Center`;
	if (title.includes(' - ')) return title.split(' - ').join(' | ');
	return title;
}

// ---- The member shown when signed in ----

export type Member = {
	name: string;
	cid: string;
	membership: 'basic' | 'community' | 'controller';
	atc?: { short: string; long: string };
	pilot?: { short: string; long: string };
};

export const sampleMember: Member = {
	name: 'Sam Rivera',
	cid: '1234567',
	membership: 'controller',
	atc: { short: 'S3', long: 'Senior Student' },
	pilot: { short: 'PPL', long: 'Private Pilot License' }
};

export const initials = (name: string) =>
	name
		.split(/\s+/)
		.map((w) => w[0])
		.slice(0, 2)
		.join('')
		.toUpperCase();

<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import {
		Footer,
		Header,
		setColorScheme,
		setPositions,
		Toaster,
		type FooterColumn,
		type NavItem
	} from '@indy-center/centerline-svelte';
	import {
		mdiAccountGroup,
		mdiAccountPlus,
		mdiAirplane,
		mdiBadgeAccountHorizontal,
		mdiBookOpenVariant,
		mdiCalendar,
		mdiCalendarClock,
		mdiEmailOutline,
		mdiForumOutline,
		mdiHandshake,
		mdiHeadset,
		mdiInformationOutline,
		mdiMessage,
		mdiRadioTower,
		mdiShieldAccount,
		mdiTools
	} from '@mdi/js';
	import { canReviewFeedback, isAdmin } from '$lib/utils/permissions';
	import { signInHref } from '$lib/utils/signIn';

	let { children, data } = $props();
	setColorScheme({ fallback: 'dark' });
	// Every <Position callsign> below names itself from the CMS catalogue's positions
	setPositions(() => data.positions);

	// This is the hub, so the header takes no `app`. Other apps (Training, Charts, Library) are in
	// the header's Apps menu, not here; Tools and the wiki aren't in it yet, so they stay.
	const siteNav: NavItem[] = [
		{ label: 'Events', href: '/events', icon: mdiCalendar },
		{
			label: 'Controlling',
			icon: mdiHeadset,
			children: [
				{ label: 'Roster', href: '/roster', icon: mdiAccountGroup },
				{ label: 'Bookings', href: '/bookings', icon: mdiCalendarClock },
				{ label: 'Join Indy Center', href: '/visit', icon: mdiAccountPlus },
				{ label: 'Tools', href: 'https://tools.flyindycenter.com', icon: mdiTools },
				{
					label: 'Controller library',
					href: 'https://wiki.flyindycenter.com/docs/home',
					icon: mdiBookOpenVariant
				}
			]
		},
		{
			label: 'Flying',
			icon: mdiAirplane,
			children: [
				{ label: 'Feedback', href: '/feedback', icon: mdiMessage },
				{ label: 'Request staffing', href: '/staffing', icon: mdiRadioTower },
				{
					label: 'Pilot library',
					href: 'https://wiki.flyindycenter.com/pilots',
					icon: mdiBookOpenVariant
				}
			]
		},
		{
			label: 'About',
			icon: mdiInformationOutline,
			children: [
				{ label: 'Staff', href: '/staff', icon: mdiBadgeAccountHorizontal },
				{ label: 'Partners', href: '/partners', icon: mdiHandshake },
				{ label: 'Socials', href: '/socials', icon: mdiForumOutline },
				{ label: 'Contact us', href: '/contact', icon: mdiEmailOutline }
			]
		}
	];

	// Admin goes in the site's navigation, never the user menu. Feedback reviewers who aren't
	// admins only have the feedback part of it.
	const nav = $derived<NavItem[]>(
		isAdmin(data.roles)
			? [...siteNav, { label: 'Admin', href: '/admin', icon: mdiShieldAccount }]
			: canReviewFeedback(data.roles)
				? [...siteNav, { label: 'Reviews', href: '/admin/feedback', icon: mdiShieldAccount }]
				: siteNav
	);

	const member = $derived(
		data.user
			? {
					name: data.userName ?? String(data.user.cid),
					cid: data.user.cid,
					// The controller rating only for controllers; the pilot rating for everyone
					rating:
						data.user.membership === 'controller'
							? data.user.data.vatsim.rating.short || undefined
							: undefined,
					pilotRating: data.user.data.vatsim.pilotrating.id || undefined
				}
			: undefined
	);

	const columns: FooterColumn[] = [
		{
			heading: 'Community',
			links: [
				{ href: '/events', label: 'Events' },
				{ href: '/roster', label: 'Roster' },
				{ href: '/staff', label: 'Staff' },
				{ href: '/partners', label: 'Partners' }
			]
		},
		{
			heading: 'Get involved',
			links: [
				{ href: '/visit', label: 'Join Indy Center' },
				{ href: '/feedback', label: 'Feedback' },
				{ href: '/staffing', label: 'Request staffing' }
			]
		},
		{
			heading: 'Help',
			links: [
				{ href: '/contact', label: 'Contact us' },
				{ href: '/socials', label: 'Socials' }
			]
		}
	];
</script>

<svelte:head>
	<title>Indy Center</title>
</svelte:head>

<div class="flex min-h-screen flex-col">
	<!-- The hub: the logo goes home and My profile and Settings are on this site, wherever it runs -->
	<Header
		{nav}
		current={page.url.pathname}
		{member}
		hub={page.url.origin}
		signInHref={signInHref(page.url.pathname + page.url.search)}
		signOutHref="/logout"
	/>
	<main id="main" class="flex w-full flex-1 flex-col">
		{#if page.url.pathname === '/'}
			{@render children?.()}
		{:else}
			<div class="mx-auto w-full max-w-6xl px-4 py-8">
				{@render children?.()}
			</div>
		{/if}
	</main>
	<Footer {columns} />
</div>
<!-- The site's one Toaster: brief confirmations after an action, raised with toast() or
     toastFromServer() -->
<Toaster />

// PROTOTYPE (prototype/chrome): the nav data names icons; this maps the names to MDI.
import type { Component } from 'svelte';
import IconHome from '~icons/mdi/home';
import IconCalendar from '~icons/mdi/calendar';
import IconHeadset from '~icons/mdi/headset';
import IconRoster from '~icons/mdi/account-group';
import IconJoin from '~icons/mdi/account-plus';
import IconAirplane from '~icons/mdi/airplane';
import IconFeedback from '~icons/mdi/message';
import IconInfo from '~icons/mdi/information-outline';
import IconStaff from '~icons/mdi/badge-account-horizontal';
import IconPartners from '~icons/mdi/handshake';
import IconContact from '~icons/mdi/email-outline';
import IconSchool from '~icons/mdi/school';
import IconTeach from '~icons/mdi/human-male-board';
import IconWaitlist from '~icons/mdi/clipboard-list';
import IconCertificate from '~icons/mdi/certificate';
import IconRecords from '~icons/mdi/folder-account';
import IconBook from '~icons/mdi/book-open-variant';
import IconAdmin from '~icons/mdi/shield-account';
import IconMap from '~icons/mdi/map';
import IconTools from '~icons/mdi/tools';

export const icons: Record<string, Component> = {
	home: IconHome,
	calendar: IconCalendar,
	headset: IconHeadset,
	roster: IconRoster,
	join: IconJoin,
	airplane: IconAirplane,
	feedback: IconFeedback,
	info: IconInfo,
	staff: IconStaff,
	partners: IconPartners,
	contact: IconContact,
	school: IconSchool,
	teach: IconTeach,
	waitlist: IconWaitlist,
	certificate: IconCertificate,
	records: IconRecords,
	book: IconBook,
	admin: IconAdmin,
	// The apps, by key.
	hub: IconHome,
	training: IconSchool,
	library: IconBook,
	charts: IconMap,
	tools: IconTools
};

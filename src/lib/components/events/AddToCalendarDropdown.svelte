<script lang="ts">
	import { page } from '$app/state';
	import { DropdownMenu, DropdownMenuItem, Icon } from '@indy-center/centerline-svelte';
	import { mdiDownloadOutline, mdiGoogle, mdiMicrosoftOutlook } from '@mdi/js';
	import type { Event } from '$lib/db/schema/events';
	import { getGoogleCalendarUrl, getOutlookCalendarUrl } from '$lib/utils/calendar';

	// compact shows the arrow alone, for use on event cards
	let { event, compact = false }: { event: Event; compact?: boolean } = $props();

	const eventUrl = $derived(`${page.url.origin}/events/${event.id}`);
</script>

<DropdownMenu
	label="Add {event.name} to your calendar"
	text={compact ? undefined : 'Add to calendar'}
>
	<DropdownMenuItem
		href={getGoogleCalendarUrl(event, eventUrl)}
		target="_blank"
		rel="noopener noreferrer"
	>
		<Icon path={mdiGoogle} />
		Google Calendar (new tab)
	</DropdownMenuItem>
	<DropdownMenuItem
		href={getOutlookCalendarUrl(event, eventUrl)}
		target="_blank"
		rel="noopener noreferrer"
	>
		<Icon path={mdiMicrosoftOutlook} />
		Outlook.com (new tab)
	</DropdownMenuItem>
	<DropdownMenuItem href="/events/{event.id}/calendar.ics" download>
		<Icon path={mdiDownloadOutline} />
		Download for Apple or other (.ics)
	</DropdownMenuItem>
</DropdownMenu>

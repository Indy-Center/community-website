<script lang="ts">
	import { page } from '$app/state';
	import IconCalendarPlus from '~icons/mdi/calendar-plus';
	import IconChevronDown from '~icons/mdi/chevron-down';
	import IconGoogle from '~icons/mdi/google';
	import IconMicrosoftOutlook from '~icons/mdi/microsoft-outlook';
	import IconDownload from '~icons/mdi/download-outline';
	import type { Event } from '$lib/db/schema/events';
	import { getGoogleCalendarUrl, getOutlookCalendarUrl } from '$lib/utils/calendar';

	// compact renders an icon-only trigger, for use on event cards
	let { event, compact = false }: { event: Event; compact?: boolean } = $props();

	let dropdownOpen = $state(false);
	let container: HTMLDivElement;

	const eventUrl = $derived(`${page.url.origin}/events/${event.id}`);

	// Close dropdown when clicking outside. Checked per instance since the
	// events page renders one of these on every card.
	function handleClickOutside(e: MouseEvent) {
		if (!container.contains(e.target as Node)) {
			dropdownOpen = false;
		}
	}
</script>

<svelte:document onclick={handleClickOutside} />

<div class="relative" bind:this={container}>
	{#if compact}
		<button
			type="button"
			onclick={() => (dropdownOpen = !dropdownOpen)}
			title="Add to Calendar"
			aria-label="Add {event.name} to calendar"
			aria-expanded={dropdownOpen}
			class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-slate-600/60 bg-slate-900/80 text-slate-300 backdrop-blur-sm transition-colors hover:border-sky-500/50 hover:text-sky-300 focus:ring-2 focus:ring-sky-500 focus:outline-none {dropdownOpen
				? 'border-sky-500/50 text-sky-300'
				: ''}"
		>
			<IconCalendarPlus class="h-4 w-4" />
		</button>
	{:else}
		<button
			type="button"
			onclick={() => (dropdownOpen = !dropdownOpen)}
			aria-expanded={dropdownOpen}
			class="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:bg-sky-700 focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-gray-900 focus:outline-none"
		>
			<IconCalendarPlus class="h-4 w-4" />
			Add to Calendar
			<IconChevronDown class="h-4 w-4 transition-transform {dropdownOpen ? 'rotate-180' : ''}" />
		</button>
	{/if}

	{#if dropdownOpen}
		<div
			class="absolute z-50 mt-2 w-56 rounded-lg border border-slate-600 bg-slate-800 p-1 shadow-xl {compact
				? 'right-0'
				: 'left-0 sm:right-0 sm:left-auto'}"
		>
			<a
				href={getGoogleCalendarUrl(event, eventUrl)}
				target="_blank"
				rel="noopener noreferrer"
				onclick={() => (dropdownOpen = false)}
				class="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-200 transition-colors hover:bg-slate-700/50"
			>
				<IconGoogle class="h-4 w-4" />
				Google Calendar
			</a>
			<a
				href={getOutlookCalendarUrl(event, eventUrl)}
				target="_blank"
				rel="noopener noreferrer"
				onclick={() => (dropdownOpen = false)}
				class="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-200 transition-colors hover:bg-slate-700/50"
			>
				<IconMicrosoftOutlook class="h-4 w-4" />
				Outlook.com
			</a>
			<a
				href="/events/{event.id}/calendar.ics"
				download
				onclick={() => (dropdownOpen = false)}
				class="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-200 transition-colors hover:bg-slate-700/50"
			>
				<IconDownload class="h-4 w-4" />
				Apple / Other (.ics)
			</a>
		</div>
	{/if}
</div>

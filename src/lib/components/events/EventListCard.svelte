<script lang="ts">
	import type { Event } from '$lib/db/schema/events';

	let { event }: { event: Event } = $props();

	const startDate = event.startTime;
	const endDate = event.endTime;
	const startTimeZ = startDate.toISOString().slice(11, 16) + 'Z';
	const endTimeZ = endDate.toISOString().slice(11, 16) + 'Z';
	const startLocal = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	const endLocal = endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	const eventDate = startDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
</script>

<a
	href={`/events/${event.id}`}
	class="relative block h-36 cursor-pointer overflow-hidden rounded-lg shadow-sm transition-shadow hover:shadow-md"
	style={event.bannerUrl ? `background-image: url('${event.bannerUrl}'); background-size: cover; background-position: center; background-repeat: no-repeat;` : ''}
>
	<!-- Blue gradient overlay -->
	<div class="absolute inset-0 bg-gradient-to-br from-blue-600/80 to-sky-500/60"></div>
	<!-- Dark overlay for better text readability -->
	<div class="absolute inset-0 bg-black/40"></div>

	<div class="relative flex h-full flex-col p-3 text-white">
		<!-- Title with bottom border -->
		<h4 class="mb-1.5 border-b border-white/20 pb-1.5 text-sm font-semibold">{event.name}</h4>

		<!-- Description takes remaining space -->
		<div class="relative flex-1">
			<p class="line-clamp-3 overflow-hidden text-xs opacity-90">{event.description}</p>
		</div>

		<!-- Date and time info with top border -->
		<div class="mt-1.5 space-y-0.5 border-t border-white/20 pt-1.5">
			<div class="flex items-center justify-between">
				<span class="text-xs font-medium">{eventDate}</span>
				<span class="text-xs opacity-90">{startTimeZ} - {endTimeZ}</span>
			</div>
			<div class="text-center text-xs opacity-75">{startLocal} - {endLocal}</div>
		</div>
	</div>
</a>

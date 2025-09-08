<script lang="ts">
	import { format } from 'date-fns';
	import { UTCDate } from '@date-fns/utc';

	type DatabaseEvent = {
		id: string;
		name: string;
		description: string;
		type: string;
		rosterType: string;
		bannerUrl: string;
		startTime: Date;
		endTime: Date;
		isPublished: boolean;
		createdAt: Date;
		updatedAt: Date;
	};

	let { event }: { event: DatabaseEvent } = $props();

	const startDate = new Date(event.startTime);
	const endDate = new Date(event.endTime);
	const startTimeUTC = format(startDate, 'HH:mm', { in: new UTCDate() }) + 'Z';
	const endTimeUTC = format(endDate, 'HH:mm', { in: new UTCDate() }) + 'Z';
	const startLocal = format(startDate, 'HH:mm');
	const endLocal = format(endDate, 'HH:mm');
	const eventDate = format(startDate, 'MMM d');
</script>

<div
	class="relative h-36 overflow-hidden rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer block"
	style="background-image: url('{event.bannerUrl}'); background-size: cover; background-position: center; background-repeat: no-repeat;"
>
	<!-- Blue gradient overlay -->
	<div class="absolute inset-0 bg-gradient-to-br from-blue-600/80 to-sky-500/60"></div>
	<!-- Dark overlay for better text readability -->
	<div class="absolute inset-0 bg-black/40"></div>
	
	<div class="relative flex flex-col p-3 h-full text-white">
		<!-- Title with bottom border -->
		<h4 class="text-sm font-semibold pb-1.5 mb-1.5 border-b border-white/20">{event.name}</h4>
		
		<!-- Description takes remaining space -->
		<p class="text-xs opacity-90 line-clamp-3 flex-1">{event.description}</p>
		
		<!-- Date and time info with top border -->
		<div class="space-y-0.5 pt-1.5 mt-1.5 border-t border-white/20">
			<div class="flex items-center justify-between">
				<span class="text-xs font-medium">{eventDate}</span>
				<span class="text-xs opacity-90">{startTimeUTC} - {endTimeUTC}</span>
			</div>
			<div class="text-xs opacity-75 text-center">{startLocal} - {endLocal}</div>
		</div>
	</div>
</div>
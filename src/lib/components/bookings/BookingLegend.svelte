<script lang="ts">
	import { BOOKING_TYPES } from './bookingTypes';

	let { class: className = '' }: { class?: string } = $props();
</script>

<!-- What the calendar colours mean; each block's tooltip also names its type -->
<ul
	aria-label="Booking colors"
	class="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-300 {className}"
>
	{#each BOOKING_TYPES as { type, label, classes } (type)}
		<li class="flex items-center gap-2">
			<span class="size-3.5 shrink-0 rounded-sm border {classes}" aria-hidden="true"></span>
			{label}
		</li>
	{/each}
</ul>

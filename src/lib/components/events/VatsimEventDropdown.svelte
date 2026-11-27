<script lang="ts">
	import { DropdownMenu, DropdownMenuItem, Time } from '@indy-center/centerline-svelte';
	import type { VatsimEvent } from '$lib/types/vatsim';

	const { vatsimEvents }: { vatsimEvents: VatsimEvent[] } = $props();
</script>

<!-- Each opens the new-event form filled in from that VATSIM event -->
{#if vatsimEvents.length > 0}
	<DropdownMenu label="Import an event from VATSIM" text="Import from VATSIM">
		{#each vatsimEvents as event (event.id)}
			<DropdownMenuItem href="/events/new?importId={event.id}">
				<span class="flex min-w-0 flex-col">
					<span class="truncate">{event.name}</span>
					{#if event.start_time}
						<span class="text-xs text-muted-foreground">
							<Time value={event.start_time} show="datetime" zone="zulu" />
						</span>
					{/if}
				</span>
			</DropdownMenuItem>
		{/each}
	</DropdownMenu>
{/if}

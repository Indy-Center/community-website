<script lang="ts">
	import {
		EmptyState,
		getPositions,
		groupByPosition,
		Icon,
		Panel
	} from '@indy-center/centerline-svelte';
	import PilotOnlineController from './PilotOnlineController.svelte';
	import { mdiAccountGroup } from '@mdi/js';
	import type { VnasController } from '$lib/types/vnas';

	let { controllers }: { controllers: VnasController[] } = $props();

	const positions = getPositions();

	// One row per position: a relief login joins the person on the position it covers
	const groups = $derived(
		groupByPosition(
			controllers.map((controller) => ({
				callsign: controller.vatsimData.callsign,
				positionId: controller.primaryPositionId,
				name: controller.vatsimData.realName,
				cid: controller.vatsimData.cid,
				loggedInAt: controller.loginTime,
				info: controller.vatsimData.controllerInfo || null
			})),
			positions()
		)
	);
</script>

<Panel title="Controllers online" level={2} flush>
	{#snippet icon()}<Icon path={mdiAccountGroup} />{/snippet}
	{#if groups.length > 0}
		<ul class="divide-y divide-border">
			{#each groups as group (group.callsign)}
				<li class="px-4 py-2.5">
					<PilotOnlineController
						callsign={group.callsign}
						positionId={group.position?.id}
						members={group.logins}
					/>
				</li>
			{/each}
		</ul>
	{:else}
		<EmptyState size="inline" class="px-4 py-3">No controllers are online right now.</EmptyState>
	{/if}
</Panel>

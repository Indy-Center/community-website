<!-- Shown in place of partners when the CMS is unavailable and no copy is kept. -->
<script lang="ts">
	import { EmptyState, Icon } from '@indy-center/centerline-svelte';
	import { mdiCloudOffOutline } from '@mdi/js';
</script>

<EmptyState title="Partners are unavailable" level={2}>
	{#snippet icon()}<Icon path={mdiCloudOffOutline} />{/snippet}
	Partners couldn't be loaded. Try again in a little while.
</EmptyState>

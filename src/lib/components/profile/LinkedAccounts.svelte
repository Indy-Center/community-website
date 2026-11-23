<script lang="ts">
	// The body of the profile's "Linked accounts" panel, beside both modes. Its controls act on
	// their own, never as part of the edit form. `links` is larry's `getLinks` answer from the
	// page's load (`data.links`), or null when larry can't be asked. The Discord row and then the
	// TeamSpeak row replace the "Coming soon" line, each in a `<ul class="divide-y divide-border">`
	// item.
	import type { Links } from '@indy-center/indy-larry-worker';

	let { links }: { links: Links | null } = $props();
</script>

<p class="text-sm text-muted-foreground" data-has-links={links !== null}>Coming soon</p>

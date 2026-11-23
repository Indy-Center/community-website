<script lang="ts">
	// Centerline's preference controls, turned off until the site's pages use Centerline's colour
	// roles and read the time zone. Nothing is saved from here.
	import { ColorSchemeSetting, TimeZoneSetting } from '@indy-center/centerline-svelte';
</script>

<p class="mb-4 text-sm text-muted-foreground">
	Coming soon to this site. These will apply across every Indy Center site.
</p>
<fieldset disabled class="grid gap-6 opacity-50">
	<ColorSchemeSetting />
	<TimeZoneSetting />
</fieldset>

<script lang="ts">
	// Centerline's preference controls. The colour scheme applies at once, here and on every Indy
	// Center site. The time zone stays off until the whole site reads it (only Bookings does yet),
	// so nothing is saved from it.
	import { ColorSchemeSetting, Text, TimeZoneSetting } from '@indy-center/centerline-svelte';
</script>

<div class="grid gap-6">
	<ColorSchemeSetting />
	<div>
		<Text size="small" class="mb-2">Time zone: coming soon to this site.</Text>
		<fieldset disabled class="opacity-50">
			<TimeZoneSetting />
		</fieldset>
	</div>
</div>

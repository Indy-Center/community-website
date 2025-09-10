<script lang="ts">
	import IconTrash from '~icons/mdi/trash-can-outline';
	import ActionButton from '../ActionButton.svelte';
</script>

<ActionButton
	action="delete"
	message="Are you sure? This action cannot be undone."
	label="Delete"
	icon={IconTrash}
	color="red"
/>

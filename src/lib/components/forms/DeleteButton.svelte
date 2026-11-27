<script lang="ts">
	import { Button, confirmAction, Icon } from '@indy-center/centerline-svelte';
	import { mdiTrashCanOutline } from '@mdi/js';

	let { what = 'this' }: { what?: string } = $props();
</script>

<!-- Posts ?/delete once the member confirms -->
<form
	method="POST"
	action="?/delete"
	onsubmit={async (event) => {
		event.preventDefault();
		const form = event.currentTarget;
		const confirmed = await confirmAction({
			title: `Delete ${what}?`,
			message: 'This cannot be undone.',
			confirmLabel: 'Delete',
			danger: true
		});
		if (confirmed) form.submit();
	}}
>
	<Button type="submit" variant="danger">
		<Icon path={mdiTrashCanOutline} />
		Delete
	</Button>
</form>

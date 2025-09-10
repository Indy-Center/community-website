<script lang="ts">
	import IconTrash from '~icons/mdi/trash-can-outline';

	let {
		action = 'delete',
		message = 'Are you sure? This action cannot be undone.',
		label = 'Delete'
	}: { action: string; message: string; label: string } = $props();
</script>

<form
	method="POST"
	action="?/{action}"
	onsubmit={(e) => {
		if (!confirm(message)) {
			e.preventDefault();
		}
	}}
	class="inline-block"
>
	<button
		type="submit"
		class="inline-flex items-center gap-2 rounded-lg bg-red-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:bg-red-600 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900 focus:outline-none"
	>
		<IconTrash class="h-4 w-4" />
		{label}
	</button>
</form>

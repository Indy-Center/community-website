<script lang="ts">
	import IconClose from '~icons/mdi/close';
	const { children, title } = $props();

	let isOpen = $state(false);

	export function open() {
		isOpen = true;
	}

	export function close() {
		isOpen = false;
	}
</script>

<svelte:window
	on:keydown={(e) => {
		if (e.key === 'Escape') {
			close();
		}
	}}
/>

{#if isOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90">
		<div class="w-fit rounded-lg bg-slate-800 p-4 text-white">
			<div class="mb-2 flex justify-between">
				<h1 class="text-xl font-bold">{title}</h1>
				<button onclick={close}>
					<IconClose class="h-4 w-4" />
				</button>
			</div>
			{@render children()}
		</div>
	</div>
{/if}

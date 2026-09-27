<script lang="ts">
	import IconChevronLeft from '~icons/mdi/chevron-left';
	import IconChevronRight from '~icons/mdi/chevron-right';

	// Page numbers start at 1. Renders nothing when everything fits on one page.
	let {
		page = $bindable(1),
		pageCount,
		class: className = ''
	}: { page?: number; pageCount: number; class?: string } = $props();

	const buttonClass =
		'inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40';
</script>

{#if pageCount > 1}
	<nav aria-label="Pagination" class="flex items-center justify-center gap-1 {className}">
		<button
			type="button"
			class="{buttonClass} text-gray-300 hover:bg-slate-700/60 hover:text-white"
			disabled={page <= 1}
			onclick={() => (page -= 1)}
			aria-label="Previous page"
		>
			<IconChevronLeft class="h-5 w-5" />
		</button>
		{#each { length: pageCount }, i (i)}
			{@const number = i + 1}
			<button
				type="button"
				class="{buttonClass} {number === page
					? 'bg-sky-600 font-medium text-white'
					: 'text-gray-300 hover:bg-slate-700/60 hover:text-white'}"
				aria-current={number === page ? 'page' : undefined}
				onclick={() => (page = number)}
			>
				{number}
			</button>
		{/each}
		<button
			type="button"
			class="{buttonClass} text-gray-300 hover:bg-slate-700/60 hover:text-white"
			disabled={page >= pageCount}
			onclick={() => (page += 1)}
			aria-label="Next page"
		>
			<IconChevronRight class="h-5 w-5" />
		</button>
	</nav>
{/if}

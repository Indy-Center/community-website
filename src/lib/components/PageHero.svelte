<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
		size?: 'default' | 'compact';
	}

	let { children, size = 'default' }: Props = $props();
</script>

<div
	class="relative flex w-full items-center overflow-hidden bg-gradient-to-b from-slate-700 to-slate-850 text-white"
	class:min-h-[200px]={size === 'default'}
	class:sm:min-h-[240px]={size === 'default'}
	class:lg:min-h-[280px]={size === 'default'}
	class:min-h-[120px]={size === 'compact'}
	class:sm:min-h-[140px]={size === 'compact'}
	class:lg:min-h-[160px]={size === 'compact'}
>
	<div
		class="absolute inset-0 z-0 bg-gradient-to-br from-slate-700/30 via-transparent to-slate-900/20 opacity-60"
	></div>
	<div
		class="absolute inset-0 z-0"
		style="background-image: radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0); background-size: 20px 20px;"
	></div>
	<div 
		class="relative z-10 mx-auto max-w-6xl px-4 text-center"
		class:py-4={size === 'default'}
		class:pt-20={size === 'default'}
		class:py-1={size === 'compact'}
		class:pt-16={size === 'compact'}
	>
		{@render children()}
	</div>
</div>
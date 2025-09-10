<script lang="ts">
	type Props = {
		title: string;
		children: any;
		icon?: any;
		overflow?: boolean;
		mode?: 'dark' | 'light';
	};

	let { title, children, icon: Icon, overflow = false, mode = 'dark' }: Props = $props();

	const overflowClasses = overflow ? 'overflow-scroll md:max-h-72' : 'overflow-hidden';
	const modeClasses =
		mode === 'dark'
			? 'bg-slate-800/60 border-slate-700/60 text-white backdrop-blur-sm'
			: 'bg-white border-gray-200 text-gray-900';
	const headerModeClasses =
		mode === 'dark'
			? 'border-slate-700/60'
			: 'border-gray-200';
	const gradientClass = mode === 'dark' ? 'md:after:from-slate-800/60 md:after:to-transparent' : 'md:after:from-white md:after:to-transparent';
	const wrapperClasses = overflow
		? `h-full relative md:after:pointer-events-none md:after:absolute md:after:bottom-0 md:after:left-0 md:after:right-0 md:after:h-6 md:after:bg-gradient-to-t ${gradientClass}`
		: 'h-full';
</script>

<div class="h-fit rounded-lg border shadow-sm {modeClasses}">
	<div class="border-b px-4 py-3 {headerModeClasses}">
		<div class="flex items-center gap-2">
			{#if Icon}
				<Icon class="h-4 w-4" />
			{/if}
			<h4 class="text-sm font-semibold tracking-wide uppercase">{title}</h4>
		</div>
	</div>
	<div class={wrapperClasses}>
		<div class={overflowClasses}>
			{@render children?.()}
		</div>
	</div>
</div>

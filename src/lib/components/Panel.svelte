<script lang="ts">
	type Props = {
		title: string;
		children: any;
		icon?: any;
		overflow?: boolean;
	};

	let { title, children, icon: Icon, overflow = false }: Props = $props();

	const overflowClasses = overflow ? 'overflow-scroll md:max-h-72' : 'overflow-hidden';
	const wrapperClasses = overflow
		? 'h-full relative md:after:pointer-events-none md:after:absolute md:after:bottom-0 md:after:left-0 md:after:right-0 md:after:h-6 md:after:bg-gradient-to-t md:after:from-white md:after:to-transparent'
		: 'h-full';
</script>

<div class="h-fit rounded-lg border border-gray-200 bg-white shadow-sm">
	<div class="border-b border-gray-100 px-4 py-3">
		<div class="flex items-center gap-2">
			{#if Icon}
				<Icon class="h-4 w-4 text-gray-600" />
			{/if}
			<h4 class="text-sm font-semibold tracking-wide text-gray-900 uppercase">{title}</h4>
		</div>
	</div>
	<div class="{wrapperClasses}">
		<div class="{overflowClasses}">
			{@render children?.()}
		</div>
	</div>
</div>

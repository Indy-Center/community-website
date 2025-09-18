<script lang="ts">
	import IconCalendarEvent from '~icons/mdi/calendar-star';

	interface Props {
		src: string | null | undefined;
		alt: string;
		class?: string;
		fallbackClass?: string;
		loading?: 'lazy' | 'eager';
	}

	let { src, alt, class: className = '', fallbackClass = '', loading = 'lazy' }: Props = $props();

	let imageLoaded = $state(false);
	let imageError = $state(false);
	let imgElement: HTMLImageElement;

	// Reset states when src changes
	$effect(() => {
		if (src) {
			imageLoaded = false;
			imageError = false;
		} else {
			imageError = true;
		}
	});

	function handleLoad() {
		imageLoaded = true;
		imageError = false;
	}

	function handleError() {
		imageError = true;
		imageLoaded = false;
	}

	// Show fallback if no src or if image failed to load
	const showFallback = $derived(!src || imageError);
</script>

{#if showFallback}
	<!-- Fallback content -->
	<div class="flex items-center justify-center {fallbackClass} {className}">
		<IconCalendarEvent class="h-8 w-8 text-slate-500" />
	</div>
{:else}
	<!-- Actual image -->
	<img
		bind:this={imgElement}
		{src}
		{alt}
		{loading}
		class={className}
		onload={handleLoad}
		onerror={handleError}
	/>
{/if}
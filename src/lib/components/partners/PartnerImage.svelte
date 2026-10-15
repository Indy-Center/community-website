<!--
	A partner's logo, banner or gallery photo, drawn from the image the CMS sends. Sizing and fit
	come from `class`; width and height only reserve space while it loads.
-->
<script lang="ts">
	import type { Image } from '$lib/server/cms/types';

	let {
		image,
		decorative = false,
		loading,
		class: className
	}: {
		image: Image;
		/** Hides the image from screen readers when the text beside it already says the same. */
		decorative?: boolean;
		loading?: 'lazy' | 'eager';
		class?: string;
	} = $props();
</script>

<img
	src={image.url}
	alt={decorative ? '' : image.alt}
	width={image.width}
	height={image.height}
	{loading}
	class={className}
/>

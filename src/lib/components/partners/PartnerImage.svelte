<!--
	A partner's logo, banner or gallery photo, drawn from the image the CMS sends. Sizing and fit
	come from `class`; width and height only reserve space while it loads.
-->
<script lang="ts">
	import type { Image } from '$lib/cms/types';

	let {
		image,
		loading,
		class: className
	}: {
		image: Image;
		loading?: 'lazy' | 'eager';
		class?: string;
	} = $props();
</script>

<img
	src={image.url}
	alt={image.alt}
	width={image.width}
	height={image.height}
	{loading}
	class={className}
/>

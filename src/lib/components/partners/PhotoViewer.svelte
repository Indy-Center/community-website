<!--
	A partner's photos full screen. Open by setting `index`; the buttons and arrow keys step through
	the photos, and Escape or a tap outside the photo closes it.
-->
<script lang="ts">
	import type { Attachment } from 'svelte/attachments';
	import type { Image } from '$lib/server/cms/types';
	import IconClose from '~icons/mdi/close';
	import IconPrevious from '~icons/mdi/chevron-left';
	import IconNext from '~icons/mdi/chevron-right';

	let { photos, index = $bindable() }: { photos: Image[]; index: number | null } = $props();

	let dialog = $state<HTMLDivElement>();
	const photo = $derived(index === null ? null : photos[index]);

	/**
	 * Runs when the viewer opens: moves focus to Close, and on closing hands it back to whatever
	 * opened the viewer. Stepping between photos keeps the dialog mounted, so focus stays put.
	 */
	const moveFocus: Attachment<HTMLElement> = (node) => {
		const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		node.querySelector<HTMLButtonElement>('button[data-close]')?.focus();
		return () => opener?.focus();
	};

	function step(by: number) {
		if (index === null) return;
		index = (index + by + photos.length) % photos.length;
	}

	/** Keeps Tab and Shift+Tab cycling through the viewer's buttons while it is open. */
	function trapTab(e: KeyboardEvent) {
		if (!dialog) return;
		const buttons = [...dialog.querySelectorAll<HTMLElement>('button:not([tabindex="-1"])')];
		const first = buttons[0];
		const last = buttons[buttons.length - 1];
		const active = document.activeElement;
		if (!dialog.contains(active)) {
			e.preventDefault();
			first.focus();
		} else if (e.shiftKey && active === first) {
			e.preventDefault();
			last.focus();
		} else if (!e.shiftKey && active === last) {
			e.preventDefault();
			first.focus();
		}
	}
</script>

<svelte:window
	onkeydown={(e) => {
		if (index === null) return;
		if (e.key === 'Escape') index = null;
		else if (e.key === 'ArrowLeft') step(-1);
		else if (e.key === 'ArrowRight') step(1);
		else if (e.key === 'Tab') trapTab(e);
	}}
/>

{#if photo && index !== null}
	<div
		bind:this={dialog}
		{@attach moveFocus}
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 sm:p-16"
		role="dialog"
		aria-modal="true"
		aria-label="Photos"
	>
		<!-- The backdrop: a tap anywhere outside the photo closes the viewer. -->
		<button
			type="button"
			class="absolute inset-0 cursor-default"
			tabindex="-1"
			aria-hidden="true"
			onclick={() => (index = null)}
		></button>
		<img
			src={photo.url}
			alt={photo.alt}
			width={photo.width}
			height={photo.height}
			class="relative max-h-full w-auto max-w-full rounded object-contain"
		/>
		<button
			data-close
			type="button"
			aria-label="Close"
			class="absolute top-4 right-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
			onclick={() => (index = null)}><IconClose class="h-6 w-6" aria-hidden="true" /></button
		>
		{#if photos.length > 1}
			<button
				type="button"
				aria-label="Previous photo"
				class="absolute left-2 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:left-4"
				onclick={() => step(-1)}><IconPrevious class="h-7 w-7" aria-hidden="true" /></button
			>
			<button
				type="button"
				aria-label="Next photo"
				class="absolute right-2 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:right-4"
				onclick={() => step(1)}><IconNext class="h-7 w-7" aria-hidden="true" /></button
			>
			<div class="absolute bottom-4 text-sm text-white/70" aria-live="polite">
				{index + 1} / {photos.length}
			</div>
		{/if}
	</div>
{/if}

<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import IconCheck from '~icons/mdi/check';
	import IconChevronDown from '~icons/mdi/chevron-down';
	import IconBullhorn from '~icons/mdi/bullhorn';
	import IconIncognito from '~icons/mdi/incognito';

	// Accept opens a menu: accept only, or accept and publish the submission as it was sent.
	// Used on the feedback list and the feedback page, so actions post to the feedback page.
	let {
		feedbackId,
		note = '',
		align = 'right',
		onresult
	}: {
		feedbackId: string;
		note?: string;
		// Which edge of the button the menu lines up with
		align?: 'left' | 'right';
		onresult?: (success: boolean) => void;
	} = $props();

	let open = $state(false);
	let submitting = $state(false);
	let container: HTMLDivElement;

	const CONFIRM: Record<string, string> = {
		identified:
			"Accept and publish this feedback as is? It goes to Discord and the public profile with the pilot's name and callsign. The Discord post can't be undone.",
		deidentified:
			"Accept and publish this feedback de-identified? It goes on the controller's private profile without pilot details and isn't posted to Discord. This can't be undone."
	};

	const submit: SubmitFunction = ({ formData, cancel }) => {
		open = false;
		const mode = formData.get('mode');
		if (typeof mode === 'string' && CONFIRM[mode] && !confirm(CONFIRM[mode])) {
			cancel();
			return;
		}
		submitting = true;
		return async ({ update, result }) => {
			submitting = false;
			await update({ reset: false });
			onresult?.(result.type === 'success');
		};
	};

	function closeOnOutside(event: MouseEvent) {
		if (open && !container.contains(event.target as Node)) open = false;
	}

	const base = $derived(`/admin/feedback/${feedbackId}`);
</script>

<svelte:window onclick={closeOnOutside} onkeydown={(e) => e.key === 'Escape' && (open = false)} />

<div class="relative" bind:this={container}>
	<form method="POST" action="{base}?/accept" use:enhance={submit}>
		<input type="hidden" name="note" value={note} />
		<button
			type="button"
			disabled={submitting}
			onclick={() => (open = !open)}
			aria-haspopup="menu"
			aria-expanded={open}
			class="flex items-center gap-2 rounded-lg border border-green-600 bg-green-700 px-4 py-2 text-sm text-white hover:bg-green-600 disabled:opacity-60"
		>
			<IconCheck class="h-4 w-4" />
			Accept
			<IconChevronDown class="h-4 w-4 transition-transform {open ? 'rotate-180' : ''}" />
		</button>

		{#if open}
			<div
				role="menu"
				class="absolute top-full {align === 'left'
					? 'left-0'
					: 'right-0'} z-20 mt-1 w-72 overflow-hidden rounded-lg border border-slate-600 bg-slate-800 shadow-xl"
			>
				<button
					type="submit"
					role="menuitem"
					class="flex w-full items-start gap-2 px-4 py-3 text-left text-sm text-gray-200 hover:bg-slate-700"
				>
					<IconCheck class="mt-0.5 h-4 w-4 shrink-0 text-green-400" />
					<span>
						Accept only
						<span class="block text-xs text-gray-400">Controller's private profile</span>
					</span>
				</button>
				<button
					type="submit"
					role="menuitem"
					formaction="{base}?/acceptAndPublish"
					name="mode"
					value="deidentified"
					class="flex w-full items-start gap-2 border-t border-slate-700 px-4 py-3 text-left text-sm text-gray-200 hover:bg-slate-700"
				>
					<IconIncognito class="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
					<span>
						Accept & publish de-identified
						<span class="block text-xs text-gray-400">Private profile, no Discord post</span>
					</span>
				</button>
				<button
					type="submit"
					role="menuitem"
					formaction="{base}?/acceptAndPublish"
					name="mode"
					value="identified"
					class="flex w-full items-start gap-2 border-t border-slate-700 px-4 py-3 text-left text-sm text-gray-200 hover:bg-slate-700"
				>
					<IconBullhorn class="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
					<span>
						Accept & publish as is
						<span class="block text-xs text-gray-400">Discord and public profile</span>
					</span>
				</button>
			</div>
		{/if}
	</form>
</div>

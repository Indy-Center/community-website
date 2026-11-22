<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import {
		Button,
		confirmAction,
		DropdownMenu,
		DropdownMenuItem,
		Icon
	} from '@indy-center/centerline-svelte';
	import { mdiBullhorn, mdiCheck, mdiIncognito } from '@mdi/js';

	// Accept, with a menu beside it to accept and publish the submission as it was sent in one
	// step. Used on the feedback list and the feedback page, so it posts to the feedback page.
	let {
		feedbackId,
		controllerName,
		note = '',
		onresult
	}: {
		feedbackId: string;
		// Names the menu for screen readers: "More ways to accept feedback for Jo Rivera"
		controllerName: string;
		note?: string;
		onresult?: (success: boolean) => void;
	} = $props();

	let submitting = $state(false);

	const CONFIRM = {
		identified: {
			title: 'Accept and publish as is?',
			message:
				"It's posted to Discord with the pilot's name and callsign, and shown on the controller's private profile. The Discord post can't be undone.",
			confirmLabel: 'Accept and publish'
		},
		deidentified: {
			title: 'Accept and publish de-identified?',
			message:
				"It's shown on the controller's private profile without the pilot's details, and isn't posted to Discord. This can't be undone.",
			confirmLabel: 'Accept and publish'
		}
	};

	const submit: SubmitFunction = async ({ formData, cancel }) => {
		const mode = formData.get('mode');
		if (mode === 'identified' || mode === 'deidentified') {
			if (!(await confirmAction({ ...CONFIRM[mode], danger: true }))) {
				cancel();
				return;
			}
		}
		submitting = true;
		return async ({ update, result }) => {
			submitting = false;
			await update({ reset: false });
			onresult?.(result.type === 'success');
		};
	};

	const base = $derived(`/admin/feedback/${feedbackId}`);
</script>

<form method="POST" action="{base}?/accept" use:enhance={submit} class="flex">
	<input type="hidden" name="note" value={note} />
	<Button type="submit" class="rounded-r-none" busy={submitting} busyLabel="Saving">
		<Icon path={mdiCheck} />
		Accept
	</Button>
	<DropdownMenu
		label="More ways to accept feedback for {controllerName}"
		attached
		variant="primary"
		disabled={submitting}
	>
		<DropdownMenuItem
			type="submit"
			formaction="{base}?/acceptAndPublish"
			name="mode"
			value="deidentified"
		>
			<Icon path={mdiIncognito} />
			Accept and publish de-identified
		</DropdownMenuItem>
		<DropdownMenuItem
			type="submit"
			formaction="{base}?/acceptAndPublish"
			name="mode"
			value="identified"
		>
			<Icon path={mdiBullhorn} />
			Accept and publish to Discord
		</DropdownMenuItem>
	</DropdownMenu>
</form>

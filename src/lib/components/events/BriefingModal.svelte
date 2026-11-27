<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { Alert, Button, Field, Input, Modal, Textarea } from '@indy-center/centerline-svelte';
	import { briefingLength, DISCORD_LIMIT } from '$lib/utils/briefing';

	type Props = {
		/** The event page's briefing data: what was last sent, and the post's length before typing. */
		briefing: { sent: boolean; text: string; briefUrl: string; fixedLength: number };
		open: boolean;
	};

	let { briefing, open = $bindable(false) }: Props = $props();

	// What was sent last, to edit; a fresh briefing otherwise
	let text = $state(briefing.text);
	let briefUrl = $state(briefing.briefUrl);
	let busy = $state(false);
	let error = $state<string>();
	let urlError = $state<string>();
	// Who the ping couldn't reach, once it's sent; null until then
	let missed = $state<string[] | null>(null);
	let sentNew = $state(false);

	// The role ping, title, start time and roster are counted already: the briefing gets the rest
	const left = $derived(DISCORD_LIMIT - briefingLength(briefing.fixedLength, text));
	const countText = $derived(
		left >= 0
			? `${left} ${left === 1 ? 'character' : 'characters'} left`
			: `${-left} ${left === -1 ? 'character' : 'characters'} too many`
	);
	// Said to screen readers only near the limit, so typing isn't read out key by key
	const announced = $derived(left <= 100 ? countText : '');

	const submit: SubmitFunction = () => {
		busy = true;
		error = undefined;
		urlError = undefined;
		missed = null;
		const firstSend = !briefing.sent;

		return async ({ result, update }) => {
			busy = false;
			if (result.type === 'success') {
				missed = (result.data?.briefing?.missed as string[] | undefined) ?? [];
				sentNew = firstSend;
				await update({ reset: false });
			} else if (result.type === 'failure') {
				error = result.data?.briefing?.message ?? "The briefing couldn't be sent.";
				urlError = result.data?.form?.errors?.briefUrl?.[0];
			} else if (result.type === 'error') {
				error = "The briefing couldn't be sent. Try again in a moment.";
			}
		};
	};

	function onclose() {
		error = undefined;
		missed = null;
	}
</script>

<Modal bind:open title={briefing.sent ? 'Update briefing' : 'Send briefing'} size="lg" {onclose}>
	<form
		id="briefing-form"
		method="POST"
		action="?/sendBriefing"
		use:enhance={submit}
		class="flex flex-col gap-4"
	>
		<p class="text-muted-foreground">
			{#if briefing.sent}
				Changes edit the post in #controller-announcements without pinging anyone again.
			{:else}
				Larry posts this in #controller-announcements with the event's name, start time and roster,
				and pings everyone on the roster through the event's Discord role.
			{/if}
		</p>

		{#if error}
			<Alert level="danger">{error}</Alert>
		{/if}

		{#if missed}
			<Alert level="success" title={sentNew ? 'Briefing posted' : 'Briefing updated'}>
				{#if missed.length > 0}
					Not pinged, because their Discord account isn't linked or isn't in the server: {missed.join(
						', '
					)}.
				{:else}
					Everyone on the roster has the event role.
				{/if}
			</Alert>
		{/if}

		<Field label="Briefing">
			{#snippet children(control)}
				<Textarea
					{...control}
					name="text"
					rows={10}
					bind:value={text}
					aria-describedby={[control['aria-describedby'], 'briefing-count']
						.filter(Boolean)
						.join(' ')}
				/>
			{/snippet}
		</Field>
		<p
			id="briefing-count"
			class="-mt-2 text-sm {left < 0 ? 'font-semibold text-destructive' : 'text-muted-foreground'}"
		>
			{countText}
		</p>
		<p class="sr-only" aria-live="polite">{announced}</p>

		<Field
			label="Link to the brief"
			hint="Optional. Shown as an Open brief button under the post."
			error={urlError}
		>
			{#snippet children(control)}
				<Input {...control} type="url" name="briefUrl" bind:value={briefUrl} />
			{/snippet}
		</Field>
	</form>

	{#snippet actions()}
		<Button variant="secondary" onclick={() => (open = false)}>Close</Button>
		<Button type="submit" form="briefing-form" disabled={left < 0} {busy} busyLabel="Sending">
			{briefing.sent ? 'Update briefing' : 'Send briefing'}
		</Button>
	{/snippet}
</Modal>

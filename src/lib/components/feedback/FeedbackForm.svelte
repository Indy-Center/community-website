<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { page } from '$app/state';
	import { replaceState } from '$app/navigation';
	import type { SuperValidated, Infer } from 'sveltekit-superforms';
	import {
		Alert,
		Button,
		Field,
		Input,
		StarRating,
		Textarea
	} from '@indy-center/centerline-svelte';
	import ControllerSearch from './ControllerSearch.svelte';
	import type { feedbackSchema } from '$lib/forms/feedback';
	import type { PickableShownMember } from '$lib/members';

	const {
		data,
		controllers
	}: {
		data: SuperValidated<Infer<typeof feedbackSchema>>;
		controllers: PickableShownMember[];
	} = $props();

	const { form, errors, enhance, constraints, message } = superForm(data);

	// The stars, one to five, stand for the stored ratings in order
	const RATINGS = ['poor', 'fair', 'good', 'very_good', 'excellent'] as const;

	// Keep the URL in sync as /feedback/<cid> so the link for the selected controller can be copied
	$effect(() => {
		const cid = controllers.find((c) => c.id === $form.controllerId)?.cid;
		if (cid && page.url.pathname !== `/feedback/${cid}`) {
			replaceState(`/feedback/${cid}`, page.state);
		}
	});
</script>

<form method="POST" use:enhance class="flex flex-col gap-6">
	{#if $message}
		<Alert level="success">{$message}</Alert>
	{/if}

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
		<div class="flex flex-col gap-6 lg:col-span-2">
			<Field
				label="Controller"
				hint="Name, operating initials or CID."
				error={$errors.controllerId?.[0]}
				required
			>
				{#snippet children(control)}
					<ControllerSearch
						{...control}
						name="controllerId"
						users={controllers}
						bind:value={$form.controllerId}
					/>
				{/snippet}
			</Field>

			<div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
				<Field
					label="Position"
					hint="Such as CMH_LCE or Indy Center."
					error={$errors.position?.[0]}
					required
				>
					{#snippet children(control)}
						<Input
							{...control}
							name="position"
							bind:value={$form.position}
							{...$constraints.position}
						/>
					{/snippet}
				</Field>
				<Field label="Your callsign" hint="Such as AAL123." error={$errors.callsign?.[0]}>
					{#snippet children(control)}
						<Input
							{...control}
							name="callsign"
							bind:value={$form.callsign}
							{...$constraints.callsign}
						/>
					{/snippet}
				</Field>
			</div>

			<!-- Sends the stars as "ratingStars"; the hidden input sends the stored rating -->
			<StarRating
				legend="Overall rating"
				name="ratingStars"
				required
				error={$errors.rating?.[0]}
				bind:value={
					() => {
						const index = RATINGS.indexOf($form.rating as (typeof RATINGS)[number]);
						return index >= 0 ? index + 1 : undefined;
					},
					(stars) => ($form.rating = stars ? RATINGS[stars - 1] : ('' as 'poor'))
				}
			/>
			<input type="hidden" name="rating" value={$form.rating} />
		</div>

		<Field
			label="Comments"
			hint="What did they do well? Anything they could do better?"
			error={$errors.feedback?.[0]}
		>
			{#snippet children(control)}
				<Textarea
					{...control}
					name="feedback"
					rows={10}
					bind:value={$form.feedback}
					{...$constraints.feedback}
				/>
			{/snippet}
		</Field>
	</div>

	<div class="border-t border-border pt-6">
		<Button type="submit">Send feedback</Button>
	</div>
</form>

<script lang="ts">
	import { superForm } from 'sveltekit-superforms';

	import type { SuperValidated, Infer } from 'sveltekit-superforms';
	import type { feedbackSchema } from '$lib/forms/feedback';
	import type { User } from '$lib/db/schema/users';

	const {
		data,
		controllers
	}: {
		data: SuperValidated<Infer<typeof feedbackSchema>>;
		controllers: User[];
	} = $props();

	const { form, errors, enhance, constraints, message } = superForm(data);
</script>

<form method="POST" use:enhance class="w-full max-w-5xl">
	{#if $message}
		<div class="mb-8 rounded-lg border border-green-400/30 bg-green-400/10 px-6 py-4 backdrop-blur-sm">
			<div class="flex items-center gap-3">
				<div class="rounded-full bg-green-400/20 p-1">
					<svg class="h-4 w-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
					</svg>
				</div>
				<p class="text-green-300 font-medium">{$message}</p>
			</div>
		</div>
	{/if}

	<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
		<!-- Main Form Fields -->
		<div class="lg:col-span-2 space-y-6">
			<!-- Controller Selection -->
			<div>
				<label for="controllerId" class="mb-2 block text-sm font-medium text-gray-300"
					>Controller {#if $errors.controllerId}<span class="text-red-400"
							>- {$errors.controllerId}</span
						>{/if}</label
				>
				<select
					name="controllerId"
					bind:value={$form.controllerId}
					class="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-white transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-500 focus:outline-none"
					aria-invalid={$errors.controllerId ? 'true' : undefined}
					{...$constraints.controllerId}
				>
					<option selected value="">Select Controller</option>
					{#each controllers as controller}
						<option value={controller.id}>
							{controller.preferredName || `${controller.firstName} ${controller.lastName}`} ({controller.cid})
						</option>
					{/each}
				</select>
			</div>

			<!-- Position and Callsign -->
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<div>
					<label for="position" class="mb-2 block text-sm font-medium text-gray-300"
						>Position {#if $errors.position}<span class="text-red-400">- {$errors.position}</span
							>{/if}</label
					>
					<input
						type="text"
						name="position"
						bind:value={$form.position}
						class="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-white placeholder-gray-400 transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-500 focus:outline-none"
						placeholder="e.g., CMH_LCE or Indy Center"
						aria-invalid={$errors.position ? 'true' : undefined}
						{...$constraints.position}
					/>
				</div>
				<div>
					<label for="callsign" class="mb-2 block text-sm font-medium text-gray-300"
						>Your Callsign <span class="text-gray-500">(optional)</span>
						{#if $errors.callsign}<span class="text-red-400">- {$errors.callsign}</span
							>{/if}</label
					>
					<input
						type="text"
						name="callsign"
						bind:value={$form.callsign}
						class="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-white placeholder-gray-400 transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-500 focus:outline-none"
						placeholder="e.g., AAL123"
						aria-invalid={$errors.callsign ? 'true' : undefined}
						{...$constraints.callsign}
					/>
				</div>
			</div>

			<!-- Rating -->
			<div>
				<label for="rating" class="mb-2 block text-sm font-medium text-gray-300"
					>Overall Rating {#if $errors.rating}<span class="text-red-400">- {$errors.rating}</span
						>{/if}</label
				>
				<select
					name="rating"
					bind:value={$form.rating}
					class="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-white transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-500 focus:outline-none"
					aria-invalid={$errors.rating ? 'true' : undefined}
					{...$constraints.rating}
				>
					<option selected value="">Select a Rating</option>
					<option value="poor">Poor</option>
					<option value="fair">Fair</option>
					<option value="good">Good</option>
					<option value="excellent">Excellent</option>
				</select>
			</div>

		</div>

		<!-- Comments Section -->
		<div class="space-y-4">
			<div>
				<label for="feedback" class="mb-2 block text-sm font-medium text-gray-300"
					>Comments <span class="text-gray-500">(optional)</span>
					{#if $errors.feedback}<span class="text-red-400">- {$errors.feedback}</span>{/if}</label
				>
				<textarea
					name="feedback"
					bind:value={$form.feedback}
					rows="12"
					class="w-full resize-none rounded-lg border border-slate-600 bg-slate-700 px-4 py-3 text-white placeholder-gray-400 transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-500 focus:outline-none"
					placeholder="Share your experience with this controller...

What did they do well? Any suggestions for improvement?"
					aria-invalid={$errors.feedback ? 'true' : undefined}
					{...$constraints.feedback}
				></textarea>
			</div>
		</div>
	</div>

	<!-- Submit Button - Outside grid to flow naturally on mobile -->
	<div class="border-t border-slate-600 pt-6 mt-8">
		<button
			type="submit"
			class="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-8 py-3 text-sm font-medium text-white shadow-lg transition-all hover:bg-sky-700 hover:shadow-xl focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-800 focus:outline-none"
		>
			Submit Feedback
		</button>
	</div>
</form>

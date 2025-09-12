<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import type { SuperValidated, Infer } from 'sveltekit-superforms';
	import type { UserSettingsSchema } from '$lib/forms/settings';

	const { data } = $props();

	const { form, errors, enhance, constraints } = superForm(data.form, {
		resetForm: false
	});
</script>

<div class="mb-8">
	<h1 class="text-3xl font-bold text-white">Settings</h1>
	<p class="mt-2 text-gray-400">Update your profile preferences</p>
</div>

<div class="mx-auto">
	<div class="overflow-hidden rounded-lg bg-slate-800/80 shadow-xl backdrop-blur-sm">
		<div class="px-8 py-6">
			<form method="POST" use:enhance>
				<div class="space-y-6">
					<!-- Profile Information -->
					<div class="space-y-4">
						<h2 class="text-lg font-semibold text-white">Profile Information</h2>

						<div class="space-y-6">
							<!-- Preferred Name -->
							<div>
								<label for="preferredName" class="mb-2 block text-sm font-medium text-gray-300"
									>Preferred Name {#if $errors.preferredName}<span class="text-red-400"
											>- {$errors.preferredName}</span
										>{/if}</label
								>
								<input
									type="text"
									name="preferredName"
									bind:value={$form.preferredName}
									class="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-white placeholder-gray-400 transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-500 focus:outline-none"
									placeholder="Enter your preferred name"
									aria-invalid={$errors.preferredName ? 'true' : undefined}
									{...$constraints.preferredName}
								/>
								<p class="mt-1 text-xs text-gray-500">
									This will be displayed instead of your full name in most places
								</p>
							</div>

							<!-- Pronouns -->
							<div>
								<label for="pronouns" class="mb-2 block text-sm font-medium text-gray-300"
									>Pronouns <span class="text-gray-500">(optional)</span>
									{#if $errors.pronouns}<span class="text-red-400">- {$errors.pronouns}</span
										>{/if}</label
								>
								<input
									type="text"
									name="pronouns"
									bind:value={$form.pronouns}
									class="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-white placeholder-gray-400 transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-500 focus:outline-none"
									placeholder="e.g., they/them, she/her, he/him"
									aria-invalid={$errors.pronouns ? 'true' : undefined}
									{...$constraints.pronouns}
								/>
								<p class="mt-1 text-xs text-gray-500">
									Your pronouns will be displayed on your profile
								</p>
							</div>
						</div>
					</div>

					<!-- Submit Button -->
					<div class="flex justify-end border-t border-slate-600 pt-6">
						<button
							type="submit"
							class="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-6 py-3 text-sm font-medium text-white shadow-lg transition-all hover:bg-sky-700 hover:shadow-xl focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-800 focus:outline-none"
						>
							Save Settings
						</button>
					</div>
				</div>
			</form>
		</div>
	</div>
</div>

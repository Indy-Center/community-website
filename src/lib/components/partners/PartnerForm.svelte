<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import type { SuperValidated, Infer } from 'sveltekit-superforms';
	import { slugify, type PartnerSchema } from '$lib/forms/partners';
	import { PARTNER_CATEGORIES } from '$lib/config/partners';
	import ImageWithFallback from '$lib/components/ui/ImageWithFallback.svelte';
	import IconHandshake from '~icons/mdi/handshake';
	import IconPlus from '~icons/mdi/plus';
	import IconClose from '~icons/mdi/close';

	const { data, action }: { data: SuperValidated<Infer<PartnerSchema>>; action?: string } =
		$props();

	// Posted as JSON so the links list can grow and shrink
	const { form, errors, enhance, constraints } = superForm(data, { dataType: 'json' });

	const inputClass =
		'w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-white placeholder-gray-400 transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-500 focus:outline-none';

	// The slug follows the name until someone edits it (or it was already saved)
	let slugEdited = $state(!!data.data.slug);

	function onNameInput() {
		if (!slugEdited) $form.slug = slugify($form.name);
	}

	function addLink() {
		$form.links = [...$form.links, { label: '', url: '' }];
	}

	function removeLink(index: number) {
		$form.links = $form.links.filter((_, i) => i !== index);
	}
</script>

<form method="POST" {action} use:enhance>
	<div class="space-y-6">
		<div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
			<!-- Name -->
			<div>
				<label for="name" class="mb-2 block text-sm font-medium text-gray-300"
					>Name {#if $errors.name}<span class="text-red-400">- {$errors.name}</span>{/if}</label
				>
				<input
					id="name"
					type="text"
					bind:value={$form.name}
					oninput={onNameInput}
					class={inputClass}
					placeholder="Partner name"
					aria-invalid={$errors.name ? 'true' : undefined}
					{...$constraints.name}
				/>
			</div>

			<!-- Slug -->
			<div>
				<label for="slug" class="mb-2 block text-sm font-medium text-gray-300"
					>Page URL {#if $errors.slug}<span class="text-red-400">- {$errors.slug}</span>{/if}</label
				>
				<div class="flex items-center gap-2">
					<span class="shrink-0 text-sm text-gray-400">/partners/</span>
					<input
						id="slug"
						type="text"
						bind:value={$form.slug}
						oninput={() => (slugEdited = true)}
						class={inputClass}
						placeholder="partner-name"
						aria-invalid={$errors.slug ? 'true' : undefined}
						{...$constraints.slug}
					/>
				</div>
			</div>
		</div>

		<div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
			<!-- Category -->
			<div>
				<label for="category" class="mb-2 block text-sm font-medium text-gray-300"
					>Category {#if $errors.category}<span class="text-red-400">- {$errors.category}</span
						>{/if}</label
				>
				<select
					id="category"
					bind:value={$form.category}
					class={inputClass}
					aria-invalid={$errors.category ? 'true' : undefined}
					{...$constraints.category}
				>
					{#each PARTNER_CATEGORIES as category (category.key)}
						<option value={category.key}>{category.label}</option>
					{/each}
				</select>
			</div>

			<!-- Sort order -->
			<div>
				<label for="sortOrder" class="mb-2 block text-sm font-medium text-gray-300"
					>Sort Order <span class="text-gray-500">(lower shows first)</span>
					{#if $errors.sortOrder}<span class="text-red-400">- {$errors.sortOrder}</span>{/if}</label
				>
				<input
					id="sortOrder"
					type="number"
					step="1"
					bind:value={$form.sortOrder}
					class={inputClass}
					aria-invalid={$errors.sortOrder ? 'true' : undefined}
					{...$constraints.sortOrder}
				/>
			</div>
		</div>

		<!-- Logo -->
		<div>
			<label for="logoUrl" class="mb-2 block text-sm font-medium text-gray-300"
				>Logo URL <span class="text-gray-500">(optional)</span>
				{#if $errors.logoUrl}<span class="text-red-400">- {$errors.logoUrl}</span>{/if}</label
			>
			<div class="flex items-center gap-4">
				<ImageWithFallback
					src={$form.logoUrl}
					alt="Logo preview"
					fallbackIcon={IconHandshake}
					class="h-16 w-16 shrink-0 rounded-lg bg-slate-900/60 object-contain p-1"
				/>
				<input
					id="logoUrl"
					type="url"
					bind:value={$form.logoUrl}
					class={inputClass}
					placeholder="https://example.com/logo.png"
					aria-invalid={$errors.logoUrl ? 'true' : undefined}
				/>
			</div>
		</div>

		<!-- Description -->
		<div>
			<label for="description" class="mb-2 block text-sm font-medium text-gray-300"
				>Description {#if $errors.description}<span class="text-red-400"
						>- {$errors.description}</span
					>{/if}</label
			>
			<textarea
				id="description"
				bind:value={$form.description}
				rows="6"
				class="{inputClass} resize-y"
				placeholder="Who they are and how we work together..."
				aria-invalid={$errors.description ? 'true' : undefined}
				{...$constraints.description}
			></textarea>
		</div>

		<!-- Links -->
		<div>
			<div class="mb-2 flex items-center justify-between">
				<span class="text-sm font-medium text-gray-300">Links</span>
				<button
					type="button"
					onclick={addLink}
					class="inline-flex items-center gap-1 rounded-lg border border-slate-600 bg-slate-700 px-3 py-1.5 text-sm text-white transition-colors hover:bg-slate-600"
				>
					<IconPlus class="h-4 w-4" />
					Add link
				</button>
			</div>
			<div class="space-y-3">
				{#each $form.links as _, index (index)}
					<div class="flex items-start gap-2">
						<div class="w-1/3 min-w-0">
							<label for="link-label-{index}" class="sr-only">Link {index + 1} label</label>
							<input
								id="link-label-{index}"
								type="text"
								bind:value={$form.links[index].label}
								class={inputClass}
								placeholder="Website"
								aria-invalid={$errors.links?.[index]?.label ? 'true' : undefined}
							/>
							{#if $errors.links?.[index]?.label}
								<p class="mt-1 text-xs text-red-400">{$errors.links[index].label}</p>
							{/if}
						</div>
						<div class="min-w-0 flex-1">
							<label for="link-url-{index}" class="sr-only">Link {index + 1} URL</label>
							<input
								id="link-url-{index}"
								type="url"
								bind:value={$form.links[index].url}
								class={inputClass}
								placeholder="https://"
								aria-invalid={$errors.links?.[index]?.url ? 'true' : undefined}
							/>
							{#if $errors.links?.[index]?.url}
								<p class="mt-1 text-xs text-red-400">{$errors.links[index].url}</p>
							{/if}
						</div>
						<button
							type="button"
							onclick={() => removeLink(index)}
							title="Remove link"
							class="mt-1.5 rounded p-1 text-gray-400 transition-colors hover:bg-red-600/20 hover:text-red-400"
						>
							<IconClose class="h-5 w-5" />
						</button>
					</div>
				{:else}
					<p class="text-sm text-gray-500 italic">No links yet.</p>
				{/each}
			</div>
		</div>

		<!-- Published -->
		<label class="flex items-center gap-3 text-sm text-gray-300">
			<input
				type="checkbox"
				bind:checked={$form.isPublished}
				class="h-4 w-4 rounded border-slate-600 bg-slate-700 text-sky-600 focus:ring-sky-500"
			/>
			Published <span class="text-gray-500">(shown on the public partners page)</span>
		</label>

		<!-- Submit -->
		<div class="flex justify-end border-t border-slate-600 pt-6">
			<button
				type="submit"
				class="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-6 py-3 text-sm font-medium text-white shadow-lg transition-all hover:bg-sky-700 hover:shadow-xl focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-800 focus:outline-none"
			>
				Save Partner
			</button>
		</div>
	</div>
</form>

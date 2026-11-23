<script lang="ts">
	// The profile's edit mode: one form, one Save, in place of the header and About.
	import { superForm, type Infer, type SuperValidated } from 'sveltekit-superforms';
	import {
		Alert,
		Button,
		Callout,
		Field,
		Fieldset,
		Input,
		Panel,
		Radio,
		Select,
		Textarea
	} from '@indy-center/centerline-svelte';
	import NamePreview from '$lib/components/profile/NamePreview.svelte';
	import {
		MAX_BIO_LENGTH,
		MAX_PREFERRED_NAME_LENGTH,
		MAX_PRONOUNS_LENGTH,
		PRONOUN_PRESETS,
		UNAVAILABLE,
		type ProfileSchema
	} from '$lib/forms/profile';
	import { nameOptions, type VatsimName } from '$lib/profile/nameChoice';

	let {
		data
	}: {
		data: {
			form: SuperValidated<Infer<ProfileSchema>>;
			canSave: boolean;
			vatsimName: VatsimName;
			hasNamePrivacy: boolean;
			privacyDefault: boolean;
			isController: boolean;
			hasDiscord: boolean;
			membership: 'basic' | 'community' | 'controller';
		};
	} = $props();

	// svelte-ignore state_referenced_locally
	const { form, errors, enhance, message, submitting } = superForm(data.form, {
		resetForm: false,
		taintedMessage: 'Discard your changes?'
	});

	const options = $derived(nameOptions(data.vatsimName));
	const bioLength = $derived($form.bio.length);
	const { firstName, lastName } = $derived(data.vatsimName);
</script>

<Panel title="Edit your profile" level={2} id="name">
	<form method="POST" use:enhance novalidate>
		<div class="space-y-6">
			{#if !data.canSave || $message}
				<Alert level="caution">{$message ?? UNAVAILABLE}</Alert>
			{/if}

			<fieldset disabled={!data.canSave} class="space-y-6">
				{#if data.privacyDefault}
					<Callout level="info">
						<p>
							You have name privacy turned on at VATUSA, so we show your first name and CID until
							you choose something else.
						</p>
					</Callout>
				{/if}

				<div class="grid gap-6 lg:grid-cols-2">
					<div class="space-y-6">
						<Fieldset legend="Show my name as">
							{#each options as option (option.choice)}
								<Radio
									name="nameChoice"
									value={option.choice}
									label={option.label}
									bind:group={$form.nameChoice}
								>
									{option.hint}
								</Radio>
							{/each}
							<Radio
								name="nameChoice"
								value="preferred"
								label="My preferred name"
								bind:group={$form.nameChoice}
							>
								Used in place of your first and last name everywhere
							</Radio>
							<Field
								label="Preferred name"
								hideLabel
								error={$errors.preferredName?.[0]}
								class="pl-8"
							>
								{#snippet children(control)}
									<Input
										{...control}
										name="preferredName"
										maxlength={MAX_PREFERRED_NAME_LENGTH}
										bind:value={$form.preferredName}
										oninput={() => ($form.nameChoice = 'preferred')}
									/>
								{/snippet}
							</Field>
						</Fieldset>

						<Field label="Pronouns" hint="Optional. Shown next to your name.">
							{#snippet children(control)}
								<Select {...control} name="pronounsChoice" bind:value={$form.pronounsChoice}>
									<option value="">None</option>
									{#each PRONOUN_PRESETS as preset (preset)}
										<option value={preset}>{preset}</option>
									{/each}
									<option value="custom">Custom…</option>
								</Select>
							{/snippet}
						</Field>
						{#if $form.pronounsChoice === 'custom'}
							<Field
								label="Your pronouns"
								hint="Up to {MAX_PRONOUNS_LENGTH} characters, such as she/they."
								error={$errors.customPronouns?.[0]}
							>
								{#snippet children(control)}
									<Input
										{...control}
										name="customPronouns"
										maxlength={MAX_PRONOUNS_LENGTH}
										bind:value={$form.customPronouns}
									/>
								{/snippet}
							</Field>
						{/if}
					</div>

					<div>
						<NamePreview
							vatsimName={data.vatsimName}
							hasNamePrivacy={data.hasNamePrivacy}
							choice={$form.nameChoice}
							customName={$form.preferredName}
							pronouns={$form.pronounsChoice === 'custom'
								? $form.customPronouns
								: $form.pronounsChoice}
							membership={data.membership}
							hasDiscord={data.hasDiscord}
						/>
						<p class="mt-3 text-xs text-muted-foreground">
							Staff can still see your VATSIM name ({firstName}
							{lastName}) on detail pages, labelled as such.
						</p>
					</div>
				</div>

				<hr class="border-border" />

				<Field
					label="Bio"
					hint="Optional. {bioLength} / {MAX_BIO_LENGTH} characters."
					error={$errors.bio?.[0]}
				>
					{#snippet children(control)}
						<Textarea
							{...control}
							name="bio"
							rows={5}
							placeholder="Tell us a bit about yourself: how you got into flight sim, favourite airports, what you fly..."
							bind:value={$form.bio}
						/>
					{/snippet}
				</Field>

				{#if data.isController}
					<hr class="border-border" />
					<div id="controlling" class="max-w-md scroll-mt-24">
						<Field
							label="Operating initials"
							hint="Assigned when you joined the roster. Change them if you like."
							error={$errors.operatingInitials?.[0]}
						>
							{#snippet children(control)}
								<Input
									{...control}
									name="operatingInitials"
									class="font-mono uppercase"
									maxlength={2}
									autocomplete="off"
									bind:value={$form.operatingInitials}
									oninput={() => ($form.operatingInitials = $form.operatingInitials.toUpperCase())}
								/>
							{/snippet}
						</Field>
						<p class="mt-3 text-xs text-muted-foreground">
							If you leave the roster, your initials stay on your record.
						</p>
					</div>
				{/if}
			</fieldset>

			<div class="flex justify-end gap-2 border-t border-border pt-4">
				<Button variant="secondary" href="/profile">Cancel</Button>
				<Button type="submit" busy={$submitting} busyLabel="Saving" disabled={!data.canSave}>
					Save profile
				</Button>
			</div>
		</div>
	</form>
</Panel>

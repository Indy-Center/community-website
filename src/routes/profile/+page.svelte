<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { format } from 'date-fns';
	import ProfileHeader from '$lib/components/profile/ProfileHeader.svelte';
	import StarDisplay from '$lib/components/profile/StarDisplay.svelte';
	import { MAX_BIO_LENGTH } from '$lib/forms/profile';
	import { RATING_STARS, ratingLabel } from '$lib/utils/feedbackRatings';
	import IconMessage from '~icons/mdi/message-text';
	import IconCheck from '~icons/mdi/check-circle';
	import IconEye from '~icons/mdi/eye';
	import IconStar from '~icons/mdi/star';

	const { data } = $props();

	const user = $derived(data.user!);

	const { form, errors, enhance, constraints, message, delayed } = superForm(data.form, {
		resetForm: false
	});

	function ratingColor(rating: string) {
		switch (rating) {
			case 'excellent':
				return 'text-green-400';
			case 'very_good':
				return 'text-teal-400';
			case 'good':
				return 'text-blue-400';
			case 'fair':
				return 'text-yellow-400';
			case 'poor':
				return 'text-red-400';
			default:
				return 'text-gray-400';
		}
	}

	const inputClass =
		'w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-white placeholder-gray-400 transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-500 focus:outline-none';

	const bioLength = $derived($form.bio?.length ?? 0);
</script>

<svelte:head>
	<title>Indy Center | Profile</title>
</svelte:head>

<div class="mb-8 flex flex-wrap items-start justify-between gap-4">
	<ProfileHeader
		name={user.preferredName || `${user.firstName} ${user.lastName}`}
		pronouns={user.pronouns}
		cid={user.cid}
		membership={user.membership}
		operatingInitials={user.operatingInitials}
		atcRating={user.data.vatsim.rating.short || null}
		pilotRating={user.data.vatsim.pilotrating.short || null}
	/>
	{#if data.hasPublicProfile}
		<a
			href="/profile/{user.cid}"
			class="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-slate-700/50 hover:text-white"
		>
			<IconEye class="h-4 w-4" />
			View public profile
		</a>
	{/if}
</div>
<p class="-mt-4 mb-6 text-sm text-gray-500">
	Change your name and pronouns in <a href="/settings" class="text-sky-400 hover:text-sky-300"
		>Settings</a
	>.
</p>

<div class="grid grid-cols-1 gap-6 lg:grid-cols-5">
	<!-- About -->
	<div
		class="h-fit overflow-hidden rounded-lg bg-slate-800/80 shadow-xl backdrop-blur-sm lg:col-span-2"
	>
		<form method="POST" use:enhance class="space-y-6 px-6 py-6">
			<h2 class="text-lg font-semibold text-white">About You</h2>

			<div>
				<label for="bio" class="mb-2 block text-sm font-medium text-gray-300">
					Bio <span class="text-gray-500">(optional)</span>
					{#if $errors.bio}<span class="text-red-400">- {$errors.bio}</span>{/if}
				</label>
				<textarea
					id="bio"
					name="bio"
					rows="6"
					bind:value={$form.bio}
					class={inputClass}
					placeholder="Tell us a bit about yourself: how you got into flight sim, favorite airports, what you fly..."
					aria-invalid={$errors.bio ? 'true' : undefined}
					{...$constraints.bio}
				></textarea>
				<div class="mt-1 flex justify-between gap-4 text-xs text-gray-500">
					<span>
						{data.hasPublicProfile
							? 'Shown on your public profile'
							: 'Only you can see this for now'}
					</span>
					<span class={bioLength > MAX_BIO_LENGTH ? 'text-red-400' : ''}>
						{bioLength} / {MAX_BIO_LENGTH}
					</span>
				</div>
			</div>

			<div class="flex items-center justify-end gap-4 border-t border-slate-600 pt-6">
				{#if $message}
					<span class="flex items-center gap-1 text-sm text-green-400">
						<IconCheck class="h-4 w-4" />
						{$message}
					</span>
				{/if}
				<button
					type="submit"
					disabled={$delayed}
					class="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-6 py-3 text-sm font-medium text-white shadow-lg transition-all hover:bg-sky-700 hover:shadow-xl focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-800 focus:outline-none disabled:opacity-60"
				>
					Save Profile
				</button>
			</div>
		</form>
	</div>

	<!-- Feedback -->
	{#if data.isController || data.feedback.length > 0}
		<div
			class="h-fit overflow-hidden rounded-lg bg-slate-800/80 shadow-xl backdrop-blur-sm lg:col-span-3"
		>
			<div class="flex items-center justify-between border-b border-slate-700/60 px-6 py-4">
				<h2 class="flex items-center gap-2 text-lg font-semibold text-white">
					<IconMessage class="h-5 w-5" />
					Your Feedback
				</h2>
				<span class="flex items-center gap-1 text-sm text-gray-400">
					{#if data.averageRating !== null}
						<IconStar class="h-4 w-4 text-yellow-400" />
						<span class="font-medium text-gray-200">{data.averageRating.toFixed(1)}</span> avg ·
					{/if}
					{data.feedback.length} approved
				</span>
			</div>

			{#if data.feedback.length === 0}
				<p class="px-6 py-8 text-center text-sm text-gray-400">
					No approved feedback yet. Once pilot feedback about you is approved, it will show up here.
				</p>
			{:else}
				<ul class="divide-y divide-slate-700/60">
					{#each data.feedback as item (item.id)}
						{@const stars = RATING_STARS[item.rating] ?? 0}
						<li class="px-6 py-4">
							<div class="flex flex-wrap items-center justify-between gap-2">
								<div class="flex items-center gap-2">
									<span class={ratingColor(item.rating)}>
										<StarDisplay
											value={stars}
											label="{ratingLabel(item.rating)}, {stars} out of 5 stars"
										/>
									</span>
									<span class="text-sm font-medium {ratingColor(item.rating)}">
										{ratingLabel(item.rating)}
									</span>
								</div>
								<div class="flex items-center gap-3 text-xs text-gray-400">
									<span class="font-mono">{item.position}</span>
									{#if item.createdAt}
										<span>{format(new Date(item.createdAt), 'MMM d, yyyy')}</span>
									{/if}
								</div>
							</div>
							{#if item.feedback?.trim()}
								<p class="mt-2 text-sm whitespace-pre-line text-gray-300">{item.feedback}</p>
							{/if}
							{#if item.callsign}
								<p class="mt-2 text-xs text-gray-400">
									—
									{#if item.submitterName}
										<span class="text-gray-300">{item.submitterName}</span> ·
									{/if}
									<span class="font-mono">{item.callsign}</span>
								</p>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/if}
</div>

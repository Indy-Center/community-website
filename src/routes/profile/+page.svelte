<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import ProfileHeader from '$lib/components/profile/ProfileHeader.svelte';
	import {
		Badge,
		EmptyState,
		Pagination,
		Panel,
		StarDisplay,
		Time
	} from '@indy-center/centerline-svelte';
	import { MAX_BIO_LENGTH } from '$lib/forms/profile';
	import { RATING_STARS, ratingLabel } from '$lib/utils/feedbackRatings';
	import { RATING_BADGES } from '$lib/utils/feedbackReview';
	import IconCheck from '~icons/mdi/check-circle';
	import IconEye from '~icons/mdi/eye';

	const { data } = $props();

	const user = $derived(data.user!);

	const FEEDBACK_PER_PAGE = 5;
	let feedbackPage = $state(1);
	const feedbackPageCount = $derived(Math.ceil(data.feedback.length / FEEDBACK_PER_PAGE));
	const pagedFeedback = $derived(
		data.feedback.slice((feedbackPage - 1) * FEEDBACK_PER_PAGE, feedbackPage * FEEDBACK_PER_PAGE)
	);

	const { form, errors, enhance, constraints, message, delayed } = superForm(data.form, {
		resetForm: false
	});

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
		staffBadges={data.staffBadges}
		certifications={data.certifications}
		endorsements={data.endorsements}
		credentials={data.credentials}
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
		<Panel title="Your feedback" level={2} flush class="h-fit lg:col-span-3">
			<p
				class="flex items-center gap-2 border-b border-border px-6 py-3 text-sm text-muted-foreground"
			>
				{#if data.averageRating !== null}
					<StarDisplay value={data.averageRating} />
					<span
						><span class="font-medium text-foreground">{data.averageRating.toFixed(1)}</span> avg ·</span
					>
				{/if}
				{data.feedback.length} accepted
			</p>

			{#if data.feedback.length === 0}
				<EmptyState size="inline" class="px-6 py-8">
					No feedback yet. Once staff review and accept pilot feedback about you, it will show up
					here.
				</EmptyState>
			{:else}
				<ul class="divide-y divide-border">
					{#each pagedFeedback as item (item.id)}
						{@const stars = RATING_STARS[item.rating] ?? 0}
						<li class="px-6 py-4">
							<div class="flex flex-wrap items-center justify-between gap-2">
								<div class="flex items-center gap-2">
									<StarDisplay
										value={stars}
										aria-label="{ratingLabel(item.rating)}, {stars} out of 5"
									/>
									<Badge size="sm" variant={RATING_BADGES[item.rating] ?? 'gray'}>
										{ratingLabel(item.rating)}
									</Badge>
								</div>
								<div class="flex items-center gap-3 text-sm text-muted-foreground">
									<span class="font-mono">{item.position}</span>
									{#if item.createdAt}
										<Time value={item.createdAt} show="datetime" />
									{/if}
								</div>
							</div>
							{#if item.feedback?.trim()}
								<p class="mt-2 whitespace-pre-line">{item.feedback}</p>
							{/if}
							<div class="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
								{#if item.submitterName || item.callsign}
									<span>
										—
										{#if item.submitterName}<span class="text-foreground">{item.submitterName}</span
											>{/if}
										{#if item.submitterName && item.callsign}·{/if}
										{#if item.callsign}<span class="font-mono">{item.callsign}</span>{/if}
									</span>
								{/if}
								{#if item.publishMode === 'identified'}
									<Badge size="sm" variant="sky" pill>Posted to Discord</Badge>
								{:else}
									<Badge size="sm" variant="gray" pill>Only visible to you</Badge>
								{/if}
							</div>
						</li>
					{/each}
				</ul>
				<Pagination
					bind:page={feedbackPage}
					pageCount={feedbackPageCount}
					label="Your feedback pages"
					class="border-t border-border px-6 py-3"
				/>
			{/if}
		</Panel>
	{/if}
</div>

<script lang="ts">
	import ProfileHeader from '$lib/components/profile/ProfileHeader.svelte';
	import StarDisplay from '$lib/components/profile/StarDisplay.svelte';
	import Pagination from '$lib/components/Pagination.svelte';
	import IconMessage from '~icons/mdi/message-text';
	import IconAccount from '~icons/mdi/account-circle';
	import IconPencil from '~icons/mdi/pencil';
	import { format } from 'date-fns';
	import { RATING_STARS, ratingLabel } from '$lib/utils/feedbackRatings';

	const { data } = $props();

	const profile = $derived(data.profile);

	const FEEDBACK_PER_PAGE = 5;
	let feedbackPage = $state(1);
	const feedbackPageCount = $derived(Math.ceil(data.feedback.length / FEEDBACK_PER_PAGE));
	const pagedFeedback = $derived(
		data.feedback.slice((feedbackPage - 1) * FEEDBACK_PER_PAGE, feedbackPage * FEEDBACK_PER_PAGE)
	);
</script>

<svelte:head>
	<title>Indy Center | {profile.name}</title>
</svelte:head>

<div class="mb-8 flex flex-wrap items-start justify-between gap-4">
	<ProfileHeader
		name={profile.name}
		pronouns={profile.pronouns}
		cid={profile.cid}
		membership={profile.membership}
		operatingInitials={profile.operatingInitials}
		atcRating={profile.atcRating}
		pilotRating={profile.pilotRating}
		staffBadges={profile.staffBadges}
	/>
	{#if data.isOwnProfile}
		<a
			href="/profile"
			class="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-slate-700/50 hover:text-white"
		>
			<IconPencil class="h-4 w-4" />
			Edit profile
		</a>
	{/if}
</div>

<div class="grid grid-cols-1 gap-6 lg:grid-cols-5">
	<!-- Bio -->
	<div class="h-fit rounded-lg bg-slate-800/80 shadow-xl backdrop-blur-sm lg:col-span-3">
		<h2
			class="flex items-center gap-2 border-b border-slate-700/60 px-6 py-4 text-lg font-semibold text-white"
		>
			<IconAccount class="h-5 w-5" />
			About
		</h2>
		{#if profile.bio}
			<p class="px-6 py-4 whitespace-pre-line text-gray-300">{profile.bio}</p>
		{:else}
			<p class="px-6 py-4 text-sm text-gray-400">
				{data.isOwnProfile ? "You haven't written a bio yet." : 'No bio yet.'}
			</p>
		{/if}
	</div>

	<!-- Feedback -->
	<div class="h-fit rounded-lg bg-slate-800/80 shadow-xl backdrop-blur-sm lg:col-span-2">
		<h2
			class="flex items-center gap-2 border-b border-slate-700/60 px-6 py-4 text-lg font-semibold text-white"
		>
			<IconMessage class="h-5 w-5" />
			Pilot Feedback
		</h2>
		<div class="px-6 py-5">
			<p class="text-sm text-gray-400">
				Flew with {profile.name} recently? Let us know how it went.
			</p>
			<a
				href="/feedback"
				class="mt-4 inline-flex text-sm font-medium text-sky-400 transition-colors hover:text-sky-300"
			>
				Leave feedback →
			</a>
		</div>
	</div>
</div>

{#if data.feedback.length > 0}
	<div class="mt-6 rounded-lg bg-slate-800/80 shadow-xl backdrop-blur-sm">
		<h2
			class="flex items-center gap-2 border-b border-slate-700/60 px-6 py-4 text-lg font-semibold text-white"
		>
			<IconMessage class="h-5 w-5" />
			What pilots are saying
		</h2>
		<ul class="divide-y divide-slate-700/60">
			{#each pagedFeedback as item (item.id)}
				{@const stars = RATING_STARS[item.rating] ?? 0}
				<li class="px-6 py-4">
					<div class="flex flex-wrap items-center justify-between gap-2">
						<StarDisplay
							value={stars}
							label="{ratingLabel(item.rating)}, {stars} out of 5 stars"
							class="h-4 w-4 text-yellow-400"
						/>
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
					{#if item.pilotName || item.callsign}
						<p class="mt-2 text-xs text-gray-400">
							—
							{#if item.pilotName}<span class="text-gray-300">{item.pilotName}</span>{/if}
							{#if item.pilotName && item.callsign}·{/if}
							{#if item.callsign}<span class="font-mono">{item.callsign}</span>{/if}
						</p>
					{/if}
				</li>
			{/each}
		</ul>
		<Pagination
			bind:page={feedbackPage}
			pageCount={feedbackPageCount}
			class="border-t border-slate-700/60 px-6 py-3"
		/>
	</div>
{/if}

<script lang="ts">
	import ProfileHeader from '$lib/components/profile/ProfileHeader.svelte';
	import StarDisplay from '$lib/components/profile/StarDisplay.svelte';
	import IconMessage from '~icons/mdi/message-text';
	import IconAccount from '~icons/mdi/account-circle';
	import IconPencil from '~icons/mdi/pencil';

	const { data } = $props();

	const profile = $derived(data.profile);
	const average = $derived(data.feedback.average);
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

	<!-- Feedback summary -->
	<div class="h-fit rounded-lg bg-slate-800/80 shadow-xl backdrop-blur-sm lg:col-span-2">
		<h2
			class="flex items-center gap-2 border-b border-slate-700/60 px-6 py-4 text-lg font-semibold text-white"
		>
			<IconMessage class="h-5 w-5" />
			Pilot Feedback
		</h2>
		<div class="px-6 py-5">
			{#if average !== null}
				<div class="flex items-center gap-3">
					<span class="text-4xl font-bold text-white">{average.toFixed(1)}</span>
					<div>
						<StarDisplay
							value={average}
							label="{average.toFixed(1)} out of 5 stars"
							class="h-5 w-5 text-yellow-400"
						/>
						<p class="mt-1 text-sm text-gray-400">
							from {data.feedback.count}
							{data.feedback.count === 1 ? 'review' : 'reviews'}
						</p>
					</div>
				</div>
			{:else}
				<p class="text-sm text-gray-400">No feedback yet.</p>
			{/if}
			<a
				href="/feedback"
				class="mt-4 inline-flex text-sm font-medium text-sky-400 transition-colors hover:text-sky-300"
			>
				Leave feedback →
			</a>
		</div>
	</div>
</div>

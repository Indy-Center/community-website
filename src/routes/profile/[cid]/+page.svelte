<script lang="ts">
	import { Button, Icon, Link, Panel, Text } from '@indy-center/centerline-svelte';
	import { mdiAccountCircle, mdiMessageText, mdiPencil } from '@mdi/js';
	import ProfileHeader from '$lib/components/profile/ProfileHeader.svelte';

	const { data } = $props();

	const profile = $derived(data.profile);
</script>

<svelte:head>
	<title>{profile.name} | Indy Center</title>
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
		certifications={profile.certifications}
		endorsements={profile.endorsements}
		credentials={profile.credentials}
	/>
	{#if data.isOwnProfile}
		<Button variant="secondary" href="/profile">
			<Icon path={mdiPencil} />
			Edit profile
		</Button>
	{/if}
</div>

<div class="grid grid-cols-1 gap-6 lg:grid-cols-5">
	<Panel title="About" level={2} class="h-fit lg:col-span-3">
		{#snippet icon()}<Icon path={mdiAccountCircle} />{/snippet}
		{#if profile.bio}
			<p class="whitespace-pre-line">{profile.bio}</p>
		{:else}
			<Text tone="muted">
				{data.isOwnProfile ? "You haven't written a bio yet." : 'No bio yet.'}
			</Text>
		{/if}
	</Panel>

	<Panel title="Pilot feedback" level={2} class="h-fit lg:col-span-2">
		{#snippet icon()}<Icon path={mdiMessageText} />{/snippet}
		<Text>Flew with {profile.name} recently? Let us know how it went.</Text>
		<p class="mt-4 text-sm">
			<Link href="/feedback/{profile.cid}">Leave feedback for {profile.name}</Link>
		</p>
	</Panel>
</div>

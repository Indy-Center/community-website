<script lang="ts">
	// The member's own profile: view mode at /profile, and edit
	// mode at /profile?edit, with Linked accounts and Display beside both.
	import ProfileHeader from '$lib/components/profile/ProfileHeader.svelte';
	import DisplaySettings from '$lib/components/profile/DisplaySettings.svelte';
	import LinkedAccounts from '$lib/components/profile/LinkedAccounts.svelte';
	import {
		Badge,
		Button,
		Callout,
		EmptyState,
		Link,
		Pagination,
		Panel,
		StarDisplay,
		Time
	} from '@indy-center/centerline-svelte';
	import { RATING_STARS, ratingLabel } from '$lib/utils/feedbackRatings';
	import { RATING_BADGES } from '$lib/utils/feedbackReview';
	import IconEye from '~icons/mdi/eye';
	import IconPencil from '~icons/mdi/pencil';
	import { enhance } from '$app/forms';
	import EditProfile from './EditProfile.svelte';

	const { data } = $props();

	const user = $derived(data.user!);

	const FEEDBACK_PER_PAGE = 5;
	let feedbackPage = $state(1);
	const feedbackPageCount = $derived(Math.ceil(data.feedback.length / FEEDBACK_PER_PAGE));
	const pagedFeedback = $derived(
		data.feedback.slice((feedbackPage - 1) * FEEDBACK_PER_PAGE, feedbackPage * FEEDBACK_PER_PAGE)
	);

	let linkingTs = $state(false);
</script>

<svelte:head>
	<title>Indy Center | Profile</title>
</svelte:head>

{#if !data.editing}
	{#if data.needsInitials}
		<Callout level="caution" class="mb-6">
			<p><Link href="/profile?edit#controlling">Choose your operating initials</Link></p>
		</Callout>
	{/if}
	{#if data.pendingTsLink}
		<!-- Above everything, so it's seen on a phone too, where Linked accounts is far down -->
		<Panel title="Link your TeamSpeak identity?" level={2} id="teamspeak-link" class="mb-6">
			<p>
				Our TeamSpeak bot sends this link in a private message when you connect to our TeamSpeak.
				Link it only if that message came to you just now: whoever's TeamSpeak it came from gets
				your roles there.
			</p>
			<form
				method="POST"
				action="?/linkTeamspeak"
				use:enhance={() => {
					linkingTs = true;
					return async ({ update }) => {
						await update();
						linkingTs = false;
					};
				}}
				class="mt-4 flex flex-wrap gap-2"
			>
				<input type="hidden" name="token" value={data.pendingTsLink} />
				<Button type="submit" busy={linkingTs} busyLabel="Linking">Link TeamSpeak</Button>
				<Button variant="secondary" href="/profile">Cancel</Button>
			</form>
		</Panel>
	{/if}
{/if}

<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
	<div class="space-y-6 lg:col-span-2">
		{#if data.editing}
			<EditProfile data={{ ...data, membership: user.membership }} />
		{:else}
			<div class="flex flex-wrap items-start justify-between gap-4">
				<ProfileHeader
					name={data.shownName}
					pronouns={data.pronouns}
					cid={user.cid}
					membership={user.membership}
					operatingInitials={data.operatingInitials}
					atcRating={user.data.vatsim.rating.short || null}
					pilotRating={user.data.vatsim.pilotrating.short || null}
					staffBadges={data.staffBadges}
					certifications={data.certifications}
					endorsements={data.endorsements}
					credentials={data.credentials}
				/>
				<div class="flex flex-wrap gap-2">
					<Button variant="secondary" href="/profile?edit">
						<IconPencil class="h-4 w-4" aria-hidden="true" /> Edit profile
					</Button>
					{#if data.hasPublicProfile}
						<Button variant="secondary" href="/profile/{user.cid}">
							<IconEye class="h-4 w-4" aria-hidden="true" /> View public profile
						</Button>
					{/if}
				</div>
			</div>

			<Panel title="About you" level={2} id="about">
				{#if data.bio}
					<p class="whitespace-pre-line">{data.bio}</p>
				{:else}
					<p class="text-muted-foreground">No bio yet. Edit your profile to add one.</p>
				{/if}
			</Panel>

			{#if data.isController || data.feedback.length > 0}
				<Panel title="Your feedback" level={2} flush class="h-fit">
					<p
						class="flex items-center gap-2 border-b border-border px-6 py-3 text-sm text-muted-foreground"
					>
						{#if data.averageRating !== null}
							<StarDisplay value={data.averageRating} />
							<span
								><span class="font-medium text-foreground">{data.averageRating.toFixed(1)}</span> avg
								·</span
							>
						{/if}
						{data.feedback.length} accepted
					</p>

					{#if data.feedback.length === 0}
						<EmptyState size="inline" class="px-6 py-8">
							No feedback yet. Once staff review and accept pilot feedback about you, it will show
							up here.
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
												{#if item.submitterName}<span class="text-foreground"
														>{item.submitterName}</span
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
		{/if}
	</div>

	<div class="space-y-6">
		<Panel title="Linked accounts" level={2} id="accounts">
			<LinkedAccounts
				discord={data.discord}
				teamspeak={data.teamspeak}
				message={data.accountsMessage}
			/>
		</Panel>
		<Panel title="Display" level={2} id="display">
			<DisplaySettings />
		</Panel>
	</div>
</div>

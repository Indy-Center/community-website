<script lang="ts">
	import {
		Alert,
		Button,
		Icon,
		Link,
		PageHeader,
		Panel,
		Text
	} from '@indy-center/centerline-svelte';
	import { mdiAccountGroup, mdiAccountMultiple, mdiEye, mdiHeart } from '@mdi/js';

	let { data } = $props();
	const { user } = data;

	const isAlreadyMember = $derived(
		user?.membership === 'community' || user?.membership === 'controller'
	);
</script>

<svelte:head>
	<title>Join Indy Center | Indy Center</title>
</svelte:head>

<PageHeader title="Join Indy Center" class="mb-8">
	A community for pilots and controllers alike. You don't need to control to be part of it.
</PageHeader>

<div class="mx-auto flex max-w-4xl flex-col gap-6">
	<Panel title="Welcome to our community" level={2}>
		{#snippet icon()}<Icon path={mdiAccountGroup} />{/snippet}
		<p>
			Indy Center is a fun way to expand your horizons in flight simulation on the VATSIM network.
			It doesn't matter if you've never flown on the network or are a seasoned pilot: you're going
			to have a good time. We have a mix of members spanning ages, experience levels, and interests.
			There is no need to be a controller or join the controller roster to join our community and
			share your passion.
		</p>
		<Text size="small" class="mt-4 rounded-lg bg-muted p-4">
			All members are expected to uphold the member expectations and represent our mission and
			vision while being respectful, responsible, empathetic, and honest.
		</Text>
	</Panel>

	<div class="grid items-start gap-6 md:grid-cols-2">
		<Panel title="Mission" level={2}>
			{#snippet icon()}<Icon path={mdiHeart} />{/snippet}
			<p>
				The Indy Center community is a vibrant and welcoming environment where flight simulation
				enthusiasts can learn, enjoy, and share their passion for air traffic control and aviation.
			</p>
		</Panel>
		<Panel title="Vision" level={2}>
			{#snippet icon()}<Icon path={mdiEye} />{/snippet}
			<p>
				We aim to foster a fun atmosphere that encourages continuous learning and skill development
				in a simulated air traffic control environment. As a close-knit community, we prioritize
				inclusivity, respect, and support to make our members feel like family.
			</p>
		</Panel>
	</div>

	<Panel title="Inclusivity" level={2}>
		{#snippet icon()}<Icon path={mdiAccountMultiple} />{/snippet}
		<p>
			Any VATSIM member is welcome to join our community, regardless of race, religion, gender, or
			sexual orientation. We embrace diversity in all forms and strive to create an inclusive and
			welcoming community where everyone's unique perspectives, backgrounds, and identities are
			respected, appreciated, and celebrated.
		</p>
		<p class="mt-4">
			<Link href="https://wiki.flyindycenter.com/policies">Read the community policies</Link>
		</p>
	</Panel>

	{#if isAlreadyMember}
		<Alert level="success" title="You're already a member">
			{user?.membership === 'controller'
				? "You're a controller member at Indy Center. Thanks for being part of our community!"
				: "You're a community member at Indy Center. Thanks for joining us!"}
		</Alert>
	{:else}
		<Panel title="Ready to join?" level={2}>
			{#snippet icon()}<Icon path={mdiAccountGroup} />{/snippet}
			<form action="?/promoteToCommunity" method="POST">
				<Button type="submit" size="lg">
					<Icon path={mdiAccountGroup} />
					Join the community
				</Button>
			</form>
		</Panel>
	{/if}
</div>

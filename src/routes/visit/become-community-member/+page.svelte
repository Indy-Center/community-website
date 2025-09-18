<script lang="ts">
	import Panel from '$lib/components/Panel.svelte';
	import IconAccountGroup from '~icons/mdi/account-group';
	import IconHeart from '~icons/mdi/heart';
	import IconEye from '~icons/mdi/eye';
	import IconAccountMultiple from '~icons/mdi/account-multiple';
	import IconOpenInNew from '~icons/mdi/open-in-new';
	import IconSchool from '~icons/mdi/school';
	import IconCheck from '~icons/mdi/check';

	let { data } = $props();
	const { user } = data;

	// Check if user is already a community member or controller
	const isAlreadyMember = $derived(
		user?.membership === 'community' || user?.membership === 'controller'
	);
</script>

<svelte:head>
	<title>Indy Center | Become a Community Member</title>
</svelte:head>

<!-- Page Header -->
<div class="mb-8">
	<h1 class="text-3xl font-bold text-white">Join Indy Center</h1>
</div>

<!-- Main Content -->
<div class="mx-auto max-w-4xl space-y-8">
	<!-- Welcome Section -->
	<Panel title="Welcome to Our Community" icon={IconAccountGroup} mode="dark">
		<div class="p-8">
			<p class="mb-6 leading-relaxed text-slate-300">
				Indy Center is a fun way to expand your horizons in flight simulation on the VATSIM network. It doesn't matter if you've never flown on the network or are a seasoned pilot- you're going to have a good time. We have a mix of members spanning ages, experience levels, and interests. There is no need to be a controller or join the controller roster to join our community and share your passion.
			</p>

			<div class="rounded-lg bg-slate-700/30 p-4">
				<p class="text-sm text-slate-300">
					All members are expected to uphold the member expectations and represent our mission and vision while being respectful, responsible, empathetic, and honest.
				</p>
			</div>
		</div>
	</Panel>

	<!-- Mission & Vision Grid -->
	<div class="grid gap-6 md:grid-cols-2">
		<!-- Mission -->
		<Panel title="Mission" icon={IconHeart} mode="dark">
			<div class="p-6">
				<p class="leading-relaxed text-slate-300">
					The Indy Center community is a vibrant and welcoming environment where flight simulation enthusiasts can learn, enjoy, and share their passion for air traffic control and aviation.
				</p>
			</div>
		</Panel>

		<!-- Vision -->
		<Panel title="Vision" icon={IconEye} mode="dark">
			<div class="p-6">
				<p class="leading-relaxed text-slate-300">
					We aim to foster a fun atmosphere that encourages continuous learning and skill development in a simulated air traffic control environment. As a close-knit community, we prioritize inclusivity, respect, and support to make our members feel like family.
				</p>
			</div>
		</Panel>
	</div>

	<!-- Inclusivity -->
	<Panel title="Inclusivity" icon={IconAccountMultiple} mode="dark">
		<div class="p-8">
			<p class="leading-relaxed text-slate-300">
				Any VATSIM member is welcome to join our community, regardless of race, religion, gender, or sexual orientation. We embrace diversity in all forms and strive to create an inclusive and welcoming community where everyone's unique perspectives, backgrounds, and identities are respected, appreciated, and celebrated.
			</p>

			<div class="mt-6">
				<a
					href="https://wiki.flyindycenter.com/policies"
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-2 rounded-lg bg-slate-600/50 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-600/70"
				>
					<span>View the Community Policies</span>
					<IconOpenInNew class="h-4 w-4" />
				</a>
			</div>
		</div>
	</Panel>

	<!-- Join Section -->
	<Panel title={isAlreadyMember ? "You're already a member!" : "Ready to join?"} icon={IconAccountGroup} mode="dark">
		<div class="p-8 text-center">
			{#if isAlreadyMember}
				<!-- Already a member message -->
				<div class="rounded-lg border border-green-500/30 bg-green-500/10 p-6">
					<div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20">
						<IconCheck class="h-6 w-6 text-green-400" />
					</div>
					<h3 class="mb-2 text-lg font-semibold text-white">Welcome to the Community!</h3>
					<p class="text-sm text-slate-300">
						{#if user?.membership === 'controller'}
							You're already a controller member at Indy Center. Thanks for being part of our community!
						{:else}
							You're already a community member at Indy Center. Thanks for joining us!
						{/if}
					</p>
				</div>
			{:else}
				<!-- Join button for non-members -->
				<form action="?/promoteToCommunity" method="POST">
					<button
						class="inline-flex items-center justify-center space-x-2 rounded-lg border border-sky-500/30 bg-sky-600/40 px-6 py-4 text-base font-medium text-white transition-colors duration-200 hover:border-sky-400/50 hover:bg-sky-500/50"
					>
						<IconAccountGroup class="h-5 w-5" />
						<span>Join Community</span>
					</button>
				</form>
			{/if}
		</div>
	</Panel>
</div>

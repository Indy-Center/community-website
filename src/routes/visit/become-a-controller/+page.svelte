<script lang="ts">
	import type { PageData } from './$types';
	import IconToolbox from '~icons/mdi/toolbox';
	import IconClock from '~icons/mdi/clock-outline';
	import IconAccount from '~icons/mdi/account';
	import IconAccountPlus from '~icons/mdi/account-plus';
	import IconSchool from '~icons/mdi/school';
	import IconEye from '~icons/mdi/eye';
	import Panel from '$lib/components/Panel.svelte';
	import { isAdmin } from '$lib/utils/permissions';

	const { data } = $props();
	const { user } = data;

	// Admin preview state
	let adminPreviewMode: string | null = $state(null);

	// Determine user's controller status
	const getControllerStatus = () => {
		// Admin preview override
		if (isAdmin(data?.roles) && adminPreviewMode) {
			return adminPreviewMode;
		}

		if (!user) return 'not-controller';

		// Check if user is already a home controller at ZID
		if (user.controller && user.controller.data.facility === 'ZID' && user.controller.data.flag_homecontroller) {
			return 'already-controller';
		}

		// Check if user has sufficient rating (S1 = rating 2, or higher) and is not OBS
		if (user.data.vatsim.rating.id >= 2) {
			return 'qualified-controller';
		}

		// User is OBS or not a controller anywhere
		return 'not-controller';
	};

	const controllerStatus = $derived(getControllerStatus());

	const getPageConfig = () => {
		switch (controllerStatus) {
			case 'already-controller':
				return {
					title: 'Become an Indy Center Controller',
					subtitle: 'Already a controller',
					description: 'Becoming a controller at Indy Center is easy. We enjoy being able to offer a very nearly completely unrestricted controlling facility. Controllers on roster can control all positions immediately.'
				};
			case 'qualified-controller':
				return {
					title: 'Become an Indy Center Controller',
					subtitle: 'Already a controller',
					description: 'Becoming a controller at Indy Center is easy. We enjoy being able to offer a very nearly completely unrestricted controlling facility. Controllers on roster can control all positions immediately.'
				};
			default:
				return {
					title: 'Become an Indy Center Controller',
					subtitle: 'Not a controller',
					description: 'Getting into controlling on VATSIM is one of the best ways to learn more about flying. Learning to control at Indy Center means you get to invest time in yourself as well as your community.'
				};
		}
	};

	const pageConfig = $derived(getPageConfig());
</script>

<svelte:head>
	<title>Indy Center | Become a Controller</title>
</svelte:head>

<!-- Page Header -->
<div class="mb-8">
	<div class="flex items-center justify-between gap-3">
		<h1 class="text-3xl font-bold text-white">Become an Indy Center Controller</h1>

		{#if isAdmin(data?.roles)}
			<div class="flex items-center gap-2">
				<span class="text-sm text-slate-400">Admin Preview:</span>
				<button
					onclick={() => adminPreviewMode = null}
					class="rounded-lg px-3 py-2 text-sm font-medium transition-colors {adminPreviewMode === null ? 'bg-slate-600 text-white' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600'}"
				>
					<IconEye class="mr-1 inline h-4 w-4" />
					Live
				</button>
				<button
					onclick={() => adminPreviewMode = 'not-controller'}
					class="rounded-lg px-3 py-2 text-sm font-medium transition-colors {adminPreviewMode === 'not-controller' ? 'bg-slate-600 text-white' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600'}"
				>
					Not Controller
				</button>
				<button
					onclick={() => adminPreviewMode = 'qualified-controller'}
					class="rounded-lg px-3 py-2 text-sm font-medium transition-colors {adminPreviewMode === 'qualified-controller' ? 'bg-slate-600 text-white' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600'}"
				>
					Qualified
				</button>
				<button
					onclick={() => adminPreviewMode = 'already-controller'}
					class="rounded-lg px-3 py-2 text-sm font-medium transition-colors {adminPreviewMode === 'already-controller' ? 'bg-slate-600 text-white' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600'}"
				>
					Already Controller
				</button>
			</div>
		{/if}
	</div>
</div>

<!-- Main Content -->
<div class="max-w-4xl mx-auto">
	<Panel title="Why Control at Indy Center?" icon={IconAccount} mode="dark">
		<div class="p-8">
			<p class="mb-6 leading-relaxed text-slate-300">
				{pageConfig.description}
			</p>

			<!-- Tools Section -->
			<div class="mb-6">
				<h3 class="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
					<IconToolbox class="h-5 w-5 text-sky-400" />
					Our controllers use some of the best tools on the VATSIM Network
				</h3>
				<div class="space-y-3">
					<a
						href="https://tools.flyindycenter.com"
						target="_blank"
						rel="noopener noreferrer"
						class="block rounded-lg bg-slate-700/30 p-4 transition-colors hover:bg-slate-700/50"
					>
						<h4 class="font-medium text-white">Controller Tools</h4>
						<p class="text-sm text-slate-400">
							Custom built to make controlling tasks easier and complex radar restrictions easy to find and comply with.
						</p>
					</a>
					<a
						href="https://wiki.flyindycenter.com"
						target="_blank"
						rel="noopener noreferrer"
						class="block rounded-lg bg-slate-700/30 p-4 transition-colors hover:bg-slate-700/50"
					>
						<h4 class="font-medium text-white">Indy Library</h4>
						<p class="text-sm text-slate-400">
							Our rich online document library makes SOPs easy to learn.
						</p>
					</a>
				</div>
			</div>

			{#if controllerStatus !== 'not-controller'}
				<!-- Requirements Section -->
				<div class="mb-6 rounded-lg border border-slate-600/50 bg-slate-700/20 p-4">
					<h3 class="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
						<IconClock class="h-5 w-5 text-green-400" />
						Quarterly Hour Requirements
					</h3>
					<div class="space-y-2 text-sm text-slate-300">
						<div class="flex justify-between">
							<span>Home Controllers:</span>
							<span class="font-medium text-white">3 hours per quarter</span>
						</div>
						<div class="flex justify-between">
							<span>Visiting Controllers:</span>
							<span class="font-medium text-white">1 hour per quarter</span>
						</div>
					</div>
				</div>
			{/if}

			<!-- Actions Section -->
			{#if controllerStatus === 'already-controller'}
				<!-- Already a controller - simple message -->
				<div class="text-center">
					<div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20 border border-green-500/30">
						<IconAccount class="h-8 w-8 text-green-400" />
					</div>
					<h3 class="text-xl font-semibold text-white">You're already a controller here!</h3>
				</div>
			{:else if controllerStatus === 'qualified-controller'}
				<!-- Qualified controller - show transfer/visit options -->
				<div class="space-y-4">
					<button class="w-full inline-flex items-center justify-center space-x-2 rounded-lg border border-sky-500/30 bg-sky-600/40 px-4 py-3 text-sm font-medium text-white transition-colors duration-200 hover:border-sky-400/50 hover:bg-sky-500/50">
						<IconAccountPlus class="h-5 w-5" />
						<span>Transfer to Indy Center</span>
					</button>
					<button class="w-full inline-flex items-center justify-center space-x-2 rounded-lg border border-sky-500/30 bg-sky-600/40 px-4 py-3 text-sm font-medium text-white transition-colors duration-200 hover:border-sky-400/50 hover:bg-sky-500/50">
						<IconAccount class="h-5 w-5" />
						<span>Visit Indy Center</span>
					</button>
				</div>
			{:else}
				<!-- Not qualified - CTA to VATUSA -->
				<div class="text-center">
					<a
						href="https://www.vatusa.net/info/join"
						target="_blank"
						rel="noopener noreferrer"
						class="inline-flex items-center justify-center space-x-2 rounded-lg border border-sky-500/30 bg-sky-600/40 px-4 py-3 text-sm font-medium text-white transition-colors duration-200 hover:border-sky-400/50 hover:bg-sky-500/50"
					>
						<IconSchool class="h-5 w-5" />
						<span>Join VATUSA</span>
					</a>
				</div>
			{/if}
		</div>
	</Panel>
</div>
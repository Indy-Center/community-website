<script lang="ts">
	import type { PageData } from './$types';
	import IconToolbox from '~icons/mdi/toolbox';
	import IconClock from '~icons/mdi/clock-outline';
	import IconAccount from '~icons/mdi/account';
	import IconAccountPlus from '~icons/mdi/account-plus';
	import IconSchool from '~icons/mdi/school';
	import IconEye from '~icons/mdi/eye';
	import IconLogin from '~icons/mdi/login';
	import IconAccountSwitch from '~icons/mdi/account-switch';
	import Panel from '$lib/components/Panel.svelte';
	import EligibilityChecklist from '$lib/components/EligibilityChecklist.svelte';
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

		// Check if user has controller membership at Indy Center
		if (user.membership === 'controller') {
			return 'already-controller';
		}

		// Check if user has community membership and sufficient VATSIM rating (S1+)
		if (user.membership === 'community' && user.data.vatsim.rating.id >= 2) {
			// Check if they're in USA division
			if (user.data?.vatsim?.division?.id === 'USA') {
				return 'qualified-controller';
			} else {
				return 'not-controller'; // Not in USA division, show Join VATUSA button
			}
		}

		// User has OBS rating or no membership - needs to join VATUSA first
		return 'not-controller';
	};

	const controllerStatus = $derived(getControllerStatus());

	const getPageConfig = () => {
		switch (controllerStatus) {
			case 'already-controller':
				return {
					title: 'Become an Indy Center Controller',
					subtitle: 'Already a controller',
					description:
						'Becoming a controller at Indy Center is easy. We enjoy being able to offer a very nearly completely unrestricted controlling facility. Controllers on roster can control any non-center position immediately.'
				};
			case 'qualified-controller':
				return {
					title: 'Why Control at Indy Center?',
					subtitle: 'Already a controller',
					description:
						'Becoming a controller at Indy Center is easy. We enjoy being able to offer a very nearly completely unrestricted controlling facility. Controllers on roster can control any non-center position immediately.'
				};
			default:
				return {
					title: 'Why Control at Indy Center?',
					subtitle: 'Not a controller',
					description:
						'Getting into controlling on VATSIM is one of the best ways to learn more about flying. Learning to control at Indy Center means you get to invest time in yourself as well as your community.'
				};
		}
	};

	const pageConfig = $derived(getPageConfig());

	// Dynamic button logic for membership progression
	const getDynamicButtonConfig = () => {
		if (!user) {
			return {
				text: 'Connect VATSIM Account',
				href: '/login/connect',
				icon: IconLogin,
				external: false,
				color: 'sky'
			};
		}

		switch (user.membership) {
			case 'controller':
				return null; // No button for existing controllers

			case 'community':
				// Check if eligible to transfer
				if (data.canTransfer) {
					return {
						text: 'Transfer to Indy Center',
						href: 'https://www.vatusa.net/my/profile',
						icon: IconAccountSwitch,
						external: true,
						color: 'green'
					};
				}
				// Otherwise show become controller page
				return {
					text: 'Become an Indy Controller',
					href: '/visit/become-a-controller',
					icon: IconAccount,
					external: false,
					color: 'sky'
				};

			case 'basic':
				return {
					text: 'Become Community Member',
					href: '/visit/become-community-member',
					icon: IconAccountPlus,
					external: false,
					color: 'sky'
				};

			default:
				// User has VATSIM account but no membership
				return {
					text: 'Join VATUSA',
					href: 'https://www.vatusa.net/info/join',
					icon: IconSchool,
					external: true,
					color: 'sky'
				};
		}
	};

	const dynamicButtonConfig = $derived(getDynamicButtonConfig());
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
					onclick={() => (adminPreviewMode = null)}
					class="rounded-lg px-3 py-2 text-sm font-medium transition-colors {adminPreviewMode ===
					null
						? 'bg-slate-600 text-white'
						: 'bg-slate-700/50 text-slate-300 hover:bg-slate-600'}"
				>
					<IconEye class="mr-1 inline h-4 w-4" />
					Live
				</button>
				<button
					onclick={() => (adminPreviewMode = 'not-controller')}
					class="rounded-lg px-3 py-2 text-sm font-medium transition-colors {adminPreviewMode ===
					'not-controller'
						? 'bg-slate-600 text-white'
						: 'bg-slate-700/50 text-slate-300 hover:bg-slate-600'}"
				>
					Not Controller
				</button>
				<button
					onclick={() => (adminPreviewMode = 'qualified-controller')}
					class="rounded-lg px-3 py-2 text-sm font-medium transition-colors {adminPreviewMode ===
					'qualified-controller'
						? 'bg-slate-600 text-white'
						: 'bg-slate-700/50 text-slate-300 hover:bg-slate-600'}"
				>
					Qualified
				</button>
				<button
					onclick={() => (adminPreviewMode = 'already-controller')}
					class="rounded-lg px-3 py-2 text-sm font-medium transition-colors {adminPreviewMode ===
					'already-controller'
						? 'bg-slate-600 text-white'
						: 'bg-slate-700/50 text-slate-300 hover:bg-slate-600'}"
				>
					Already Controller
				</button>
			</div>
		{/if}
	</div>
</div>

<!-- Main Content -->
<div class="mx-auto max-w-4xl">
	<Panel title="Why Control at Indy Center?" icon={IconAccount} mode="dark">
		<div class="p-8">
			<p class="mb-6 leading-relaxed text-slate-300">
				{pageConfig.description}
			</p>

			<!-- Actions Section -->
			{#if controllerStatus === 'already-controller'}
				<!-- Already a controller - simple message -->
				<div class="text-center">
					<div
						class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-green-500/30 bg-green-500/20"
					>
						<IconAccount class="h-8 w-8 text-green-400" />
					</div>
					<h3 class="text-xl font-semibold text-white">You're already a controller here!</h3>
				</div>
			{:else if controllerStatus === 'qualified-controller'}
				<!-- Qualified controller - show transfer/visit options in side-by-side layout -->
				<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
					<!-- Tools Section -->
					<div>
						<h3 class="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
							<IconToolbox class="h-5 w-5 text-sky-400" />
							Our Controllers Use Great Tools
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
									Custom tools for easier controlling and radar restrictions.
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
									Rich online document library with easy-to-learn SOPs.
								</p>
							</a>
						</div>

						<!-- Hour Requirements within Tools section -->
						<div class="mt-6">
							<h4 class="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
								<IconClock class="h-4 w-4 text-green-400" />
								Hour Requirements
							</h4>
							<div class="rounded-lg bg-slate-700/20 p-3">
								<div class="flex justify-between text-sm text-slate-300">
									<span>Home Controllers:</span>
									<span class="font-medium text-white">3 hours per quarter</span>
								</div>
								<div class="mt-1 flex justify-between text-sm text-slate-300">
									<span>Visiting Controllers:</span>
									<span class="font-medium text-white">1 hour per quarter</span>
								</div>
							</div>
						</div>
					</div>

					<!-- Eligibility Checklist -->
					<div>
						<EligibilityChecklist
							checklist={data.checklist}
							canVisit={data.canVisit}
							canTransfer={data.canTransfer}
							user={data.user}
						/>
					</div>
				</div>
			{:else}
				<!-- Not qualified - Join VATUSA -->
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

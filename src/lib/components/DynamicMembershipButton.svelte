<script lang="ts">
	import IconLogin from '~icons/mdi/login';
	import IconAccount from '~icons/mdi/account';
	import IconAccountPlus from '~icons/mdi/account-plus';
	import IconAccountSwitch from '~icons/mdi/account-switch';
	import IconSchool from '~icons/mdi/school';

	interface Props {
		user: any;
		canTransfer?: boolean;
		class?: string;
	}

	const { user, canTransfer = false, class: additionalClasses = '' } = $props<Props>();

	// Dynamic button logic for membership progression - shows NEXT step in journey
	const getNextStepConfig = () => {
		if (!user) {
			return {
				text: 'Connect VATSIM Account',
				href: '/login/connect',
				icon: IconLogin,
				external: false
			};
		}

		switch (user.membership) {
			case 'controller':
				return null; // No next step - they're already at the top!

			case 'community':
				// Check if they're in USA division, if not direct to VATUSA
				if (user.data?.vatsim?.division?.id !== 'USA') {
					return {
						text: 'Join VATUSA',
						href: '/visit/become-a-controller',
						icon: IconSchool,
						external: false
					};
				}
				// If they're in USA division, show become controller
				return {
					text: 'Become an Indy Controller',
					href: '/visit/become-a-controller',
					icon: IconAccount,
					external: false
				};

			case 'basic':
				return {
					text: 'Become Community Member',
					href: '/visit/become-community-member',
					icon: IconAccountPlus,
					external: false
				};

			default:
				// User has VATSIM account but no membership - need to join VATUSA first
				return {
					text: 'Join VATUSA',
					href: '/visit/become-a-controller',
					icon: IconSchool,
					external: false
				};
		}
	};

	const nextStep = $derived(getNextStepConfig());
</script>

{#if nextStep}
	{#if nextStep.external}
		<a
			href={nextStep.href}
			target="_blank"
			rel="noopener noreferrer"
			class="inline-flex cursor-pointer items-center space-x-2 rounded-lg bg-sky-600 px-6 py-3 text-sm font-medium text-white transition-all hover:bg-sky-700 {additionalClasses}"
		>
			<svelte:component this={nextStep.icon} class="h-5 w-5" />
			<span>{nextStep.text}</span>
		</a>
	{:else}
		<a
			href={nextStep.href}
			class="inline-flex cursor-pointer items-center space-x-2 rounded-lg bg-sky-600 px-6 py-3 text-sm font-medium text-white transition-all hover:bg-sky-700 {additionalClasses}"
		>
			<svelte:component this={nextStep.icon} class="h-5 w-5" />
			<span>{nextStep.text}</span>
		</a>
	{/if}
{/if}
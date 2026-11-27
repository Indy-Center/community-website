<script lang="ts">
	import { Button, Icon } from '@indy-center/centerline-svelte';
	import { mdiAccount, mdiAccountPlus, mdiLogin, mdiSchool } from '@mdi/js';

	interface Props {
		user: any;
		class?: string;
	}

	const { user, class: className = '' }: Props = $props();

	// The next step in the member's journey: none once they're a controller
	const nextStep = $derived.by(() => {
		if (!user) return { text: 'Connect VATSIM account', href: '/login/connect', icon: mdiLogin };

		switch (user.membership) {
			case 'controller':
				return null;
			case 'community':
				// Outside the USA division, they join VATUSA first
				return user.data?.vatsim?.division?.id !== 'USA'
					? { text: 'Join VATUSA', href: '/visit/become-a-controller', icon: mdiSchool }
					: {
							text: 'Become an Indy controller',
							href: '/visit/become-a-controller',
							icon: mdiAccount
						};
			case 'basic':
				return {
					text: 'Become a community member',
					href: '/visit/become-community-member',
					icon: mdiAccountPlus
				};
			default:
				return { text: 'Join VATUSA', href: '/visit/become-a-controller', icon: mdiSchool };
		}
	});
</script>

{#if nextStep}
	<Button href={nextStep.href} size="lg" class={className}>
		<Icon path={nextStep.icon} />
		{nextStep.text}
	</Button>
{/if}

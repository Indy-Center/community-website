<script lang="ts">
	import { Button, EmptyState, Icon, PageHeader } from '@indy-center/centerline-svelte';
	import { mdiAccount, mdiLogin } from '@mdi/js';
	import { signInHref } from '$lib/utils/signIn';
</script>

<svelte:head>
	<title>Get connected | Indy Center</title>
</svelte:head>

<PageHeader title="Welcome to Indianapolis Center" class="mb-8" />

<EmptyState title="Connect your VATSIM account" level={2}>
	{#snippet icon()}<Icon path={mdiAccount} />{/snippet}
	Join our community by connecting your VATSIM account. You can then give feedback on your ATC experience
	and connect with other pilots and controllers.
	{#snippet action()}
		<Button href={signInHref('/visit')}>
			<Icon path={mdiLogin} />
			Sign in with VATSIM
		</Button>
	{/snippet}
</EmptyState>

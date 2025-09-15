<script lang="ts">
	import Panel from '$lib/components/Panel.svelte';
	import IconAccount from '~icons/mdi/account';
	import IconLogin from '~icons/mdi/login';
</script>

<svelte:head>
	<title>Indy Center | Get Connected</title>
</svelte:head>

<!-- Page Header -->
<div class="mb-8">
	<h1 class="text-3xl font-bold text-white">Welcome to Indianapolis Center</h1>
</div>

<!-- Main Content -->
<div class="max-w-2xl mx-auto">
	<Panel title="Connect Your VATSIM Account" icon={IconAccount} mode="dark">
		<div class="p-8 text-center">
			<p class="mb-6 leading-relaxed text-slate-300">
				Join our community by connecting your VATSIM account! This gives you access to providing feedback on your ATC experience and connecting with other pilots and controllers.
			</p>

			<a
				href="/auth/login"
				class="inline-flex items-center justify-center space-x-2 rounded-lg border border-sky-500/30 bg-sky-600/40 px-4 py-3 text-sm font-medium text-white transition-colors duration-200 hover:border-sky-400/50 hover:bg-sky-500/50"
			>
				<IconAccount class="h-5 w-5" />
				<span>Connect VATSIM Account</span>
			</a>
		</div>
	</Panel>
</div>
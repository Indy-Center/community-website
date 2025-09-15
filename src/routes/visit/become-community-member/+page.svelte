<script lang="ts">
	import Panel from '$lib/components/Panel.svelte';
	import IconAccountGroup from '~icons/mdi/account-group';
</script>

<svelte:head>
	<title>Indy Center | Become a Community Member</title>
</svelte:head>

<!-- Page Header -->
<div class="mb-8">
	<h1 class="text-3xl font-bold text-white">Become a Community Member</h1>
</div>

<!-- Main Content -->
<div class="max-w-2xl mx-auto">
	<Panel title="Join Our Community" icon={IconAccountGroup} mode="dark">
		<div class="p-8 text-center">
			<p class="mb-6 leading-relaxed text-slate-300">
				Ready to take the next step? Become a full community member and unlock additional benefits and opportunities within Indianapolis Center.
			</p>

			<div class="bg-slate-700/20 rounded-lg p-4 mb-6">
				<h3 class="text-lg font-semibold text-white mb-2">Terms and Agreement</h3>
				<p class="text-slate-300 text-sm">
					By becoming a community member, you agree to abide by our community guidelines and standards.
				</p>
			</div>

			<button class="inline-flex items-center justify-center space-x-2 rounded-lg border border-sky-500/30 bg-sky-600/40 px-4 py-3 text-sm font-medium text-white transition-colors duration-200 hover:border-sky-400/50 hover:bg-sky-500/50">
				<IconAccountGroup class="h-5 w-5" />
				<span>Join Community</span>
			</button>
		</div>
	</Panel>
</div>
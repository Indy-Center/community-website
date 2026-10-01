<script lang="ts">
	import PartnerForm from '$lib/components/partners/PartnerForm.svelte';

	const { data } = $props();
</script>

<svelte:head>
	<title>New Partner - Admin - Indy Center</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<a href="/admin/partners" class="text-sm text-sky-400 hover:text-sky-300">← Partners</a>
		<h2 class="mt-2 text-2xl font-semibold text-white">New Partner</h2>
	</div>

	<div class="overflow-hidden rounded-lg bg-slate-800/80 shadow-xl backdrop-blur-sm">
		<div class="px-6 py-6 sm:px-8">
			<PartnerForm data={data.form} />
		</div>
	</div>
</div>

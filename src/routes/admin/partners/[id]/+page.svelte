<script lang="ts">
	import PartnerForm from '$lib/components/partners/PartnerForm.svelte';
	import DeleteButton from '$lib/components/forms/DeleteButton.svelte';

	const { data } = $props();
</script>

<svelte:head>
	<title>Edit {data.partner.name} - Admin - Indy Center</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-end justify-between gap-4">
		<div>
			<a href="/admin/partners" class="text-sm text-sky-400 hover:text-sky-300">← Partners</a>
			<h2 class="mt-2 text-2xl font-semibold text-white">Edit {data.partner.name}</h2>
			<a
				href="/partners/{data.partner.slug}"
				class="mt-1 inline-block font-mono text-xs text-gray-400 hover:text-sky-400"
				>/partners/{data.partner.slug}</a
			>
		</div>
		<DeleteButton />
	</div>

	<div class="overflow-hidden rounded-lg bg-slate-800/80 shadow-xl backdrop-blur-sm">
		<div class="px-6 py-6 sm:px-8">
			<PartnerForm data={data.form} action="?/save" />
		</div>
	</div>
</div>

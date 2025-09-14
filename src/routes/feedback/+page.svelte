<script lang="ts">
	import { page } from '$app/state';
	import IconAccount from '~icons/mdi/account';
	import FeedbackForm from '$lib/components/feedback/FeedbackForm.svelte';

	const { data } = $props();
</script>

<div class="mb-8">
	<h1 class="text-3xl font-bold text-white">Submit Feedback</h1>
	<p class="mt-2 text-gray-400">Submit controller feedback to help us improve.</p>
</div>

<div class="mx-auto flex w-fit items-center justify-center">
	<div
		class="flex flex-col items-center justify-center overflow-hidden rounded-lg bg-slate-800/80 shadow-xl backdrop-blur-sm"
	>
		<div class="flex flex-col items-center justify-center gap-4 px-8 py-6">
			{#if data.user}
				<FeedbackForm data={data.form} controllers={data.controllers} />
			{:else}
				<div class="text-gray-400">You must connect your VATSIM account to submit feedback.</div>

				<div>
					<a
						href={`/login/connect?returnUrl=${encodeURIComponent(page.url.pathname)}`}
						class="flex w-fit cursor-pointer items-center justify-center space-x-2 rounded-lg border border-sky-500/30 bg-sky-600/40 px-4 py-3 text-sm font-medium text-white transition-colors duration-200 hover:border-sky-400/50 hover:bg-sky-500/50"
					>
						<IconAccount class="h-5 w-5" />
						<span>Connect VATSIM Account</span>
					</a>
				</div>
			{/if}
		</div>
	</div>
</div>

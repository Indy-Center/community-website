<script lang="ts">
	import type { VatusaTransferChecklist } from '$lib/types/vatusa';
	import IconCheck from '~icons/mdi/check';
	import IconClose from '~icons/mdi/close';
	import IconClock from '~icons/mdi/clock-outline';
	import IconAccount from '~icons/mdi/account';

	interface Props {
		checklist: VatusaTransferChecklist;
		isEligible: boolean;
	}

	const { checklist, isEligible } = $props<Props>();

	// Compact checklist items
	const checklistItems = [
		{ key: 'hasHome', label: 'Has Home Facility', value: checklist.hasHome },
		{ key: 'needbasic', label: 'Completed Training', value: checklist.needbasic },
		{ key: 'hasRating', label: 'S3+ Rating', value: checklist.hasRating },
		{ key: '60days', label: '60+ Days Since Visit', value: checklist['60days'] },
		{ key: 'promo', label: '90+ Days Since Promotion', value: checklist.promo },
		{ key: '50hrs', label: '50+ Hours Controlling', value: checklist['50hrs'] }
	];
</script>

<!-- Status Banner -->
<div class="mb-6 rounded-lg border p-4 {isEligible
	? 'border-green-500/30 bg-green-500/10'
	: 'border-yellow-500/30 bg-yellow-500/10'}">
	<div class="flex items-center gap-3">
		{#if isEligible}
			<div class="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/20">
				<IconCheck class="h-5 w-5 text-green-400" />
			</div>
			<div>
				<h3 class="font-semibold text-green-300">Visiting Eligible!</h3>
				<p class="text-sm text-green-200/80">Ready to request visiting status</p>
			</div>
		{:else}
			<div class="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-500/20">
				<IconClock class="h-5 w-5 text-yellow-400" />
			</div>
			<div>
				<h3 class="font-semibold text-yellow-300">Not Yet Eligible</h3>
				<p class="text-sm text-yellow-200/80">Review requirements below</p>
			</div>
		{/if}
	</div>
</div>

<!-- Compact Requirements List -->
<div class="mb-6">
	<h4 class="mb-3 text-sm font-semibold text-white">Visiting Requirements</h4>
	<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
		{#each checklistItems as item}
			<div class="flex items-center gap-3 rounded-lg bg-slate-700/20 px-3 py-2 text-sm">
				<div class="flex h-5 w-5 items-center justify-center rounded-full {item.value
					? 'bg-green-500/20'
					: 'bg-red-500/20'}">
					{#if item.value}
						<IconCheck class="h-3 w-3 text-green-400" />
					{:else}
						<IconClose class="h-3 w-3 text-red-400" />
					{/if}
				</div>
				<span class="text-slate-300">{item.label}</span>
			</div>
		{/each}
	</div>

	{#if checklist.days !== undefined}
		<p class="mt-2 text-xs text-slate-400">
			Days since last transfer: {checklist.days}
		</p>
	{/if}
</div>

<!-- Action Button -->
<div class="text-center">
	{#if isEligible}
		<button class="inline-flex items-center gap-2 rounded-lg bg-green-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-green-700">
			<IconAccount class="h-4 w-4" />
			Request to Visit Indy Center
		</button>
	{:else}
		<button disabled class="inline-flex items-center gap-2 rounded-lg bg-slate-600 px-6 py-3 text-sm font-medium text-slate-400 cursor-not-allowed">
			<IconClose class="h-4 w-4" />
			Not Eligible
		</button>
	{/if}
</div>
<script lang="ts">
	import { enhance } from '$app/forms';
	import type { VatusaTransferChecklist } from '$lib/types/vatusa';
	import IconCheck from '~icons/mdi/check';
	import IconClose from '~icons/mdi/close';
	import IconClock from '~icons/mdi/clock-outline';
	import IconAccount from '~icons/mdi/account';
	import IconAccountSwitch from '~icons/mdi/account-switch';
	import IconSchool from '~icons/mdi/school';

	interface Props {
		checklist: VatusaTransferChecklist;
		canVisit: boolean;
		canTransfer: boolean;
		user?: any;
	}

	const { checklist, canVisit, canTransfer, user } = $props<Props>();

	// Visiting requirements - tight and easy to understand
	const visitingItems = [
		{
			key: 'homecontroller',
			label: 'VATUSA Controller',
			value: checklist.homecontroller
		},
		{ key: 'hasHome', label: 'Has Home Facility', value: checklist.hasHome },
		{ key: 'needbasic', label: 'Basic Exam Complete', value: checklist.needbasic },
		{ key: '50hrs', label: '50+ Hours Since Promotion', value: checklist['50hrs'] },
		{ key: 'promo', label: '90+ Days Since Promotion', value: checklist.promo },
		{ key: 'hasRating', label: 'S3+ Rating', value: checklist.hasRating }
	];

	// Transfer requirements - matching server logic exactly
	const transferItems = [
		{ key: 'needbasic', label: 'Basic Exam Complete', value: checklist.needbasic },
		{ key: '90days', label: '90+ Days Since Transfer', value: checklist['90days'] },
		{ key: '50hrs', label: '50+ Hours Since Promotion', value: checklist['50hrs'] },
		{ key: 'staff', label: 'No Staff Position', value: checklist.staff },
		{ key: 'instructor', label: 'Not an I1/I3 Rating', value: checklist.instructor },
		{ key: 'pending', label: 'No Pending Transfers', value: checklist.pending }
	];

	let activeTab = $state<'visit' | 'transfer'>('visit');
	let visitorRequestSubmitted = $state(false);
</script>

<div class="space-y-4">
	<!-- Tabs/Toggle -->
	<div class="flex rounded-lg bg-slate-700/20 p-1">
		<button
			class="flex-1 rounded-md px-4 py-2 text-center transition-all {activeTab === 'visit'
				? 'bg-slate-600'
				: 'hover:bg-slate-700/30'}"
			onclick={() => (activeTab = 'visit')}
		>
			<div class="flex items-center justify-center gap-2">
				<IconAccount class="h-4 w-4 {activeTab === 'visit' ? 'text-white' : 'text-slate-400'}" />
				<span class="text-sm font-medium {activeTab === 'visit' ? 'text-white' : 'text-slate-400'}"
					>Visit</span
				>
				{#if canVisit}
					<IconCheck class="h-3 w-3 text-green-400" />
				{:else}
					<IconClose class="h-3 w-3 text-red-400" />
				{/if}
			</div>
		</button>
		<button
			class="flex-1 px-4 py-2 text-center transition-all {activeTab === 'transfer'
				? 'rounded-md bg-slate-600'
				: 'hover:bg-slate-700/30'}"
			onclick={() => (activeTab = 'transfer')}
		>
			<div class="flex items-center justify-center gap-2">
				<IconAccountSwitch
					class="h-4 w-4 {activeTab === 'transfer' ? 'text-white' : 'text-slate-400'}"
				/>
				<span
					class="text-sm font-medium {activeTab === 'transfer' ? 'text-white' : 'text-slate-400'}"
					>Transfer</span
				>
				{#if canTransfer}
					<IconCheck class="h-3 w-3 text-green-400" />
				{:else}
					<IconClose class="h-3 w-3 text-red-400" />
				{/if}
			</div>
		</button>
	</div>

	<!-- Requirements Display -->
	{#if activeTab === 'visit'}
		<div>
			<h4 class="mb-3 text-sm font-semibold text-white">Visiting Requirements</h4>
			<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
				{#each visitingItems as item}
					<div class="flex items-center gap-3 rounded-lg bg-slate-700/20 px-3 py-2 text-sm">
						<div
							class="flex h-5 w-5 items-center justify-center rounded-full {item.value
								? 'bg-green-500/20'
								: 'bg-red-500/20'}"
						>
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
		</div>
	{:else}
		<div>
			<h4 class="mb-3 text-sm font-semibold text-white">Transfer Requirements</h4>
			<div class="grid grid-cols-1 gap-2">
				{#each transferItems as item}
					<div class="flex items-center gap-3 rounded-lg bg-slate-700/20 px-3 py-2 text-sm">
						<div
							class="flex h-5 w-5 items-center justify-center rounded-full {item.value
								? 'bg-green-500/20'
								: 'bg-red-500/20'}"
						>
							{#if item.value}
								<IconCheck class="h-3 w-3 text-green-400" />
							{:else}
								<IconClose class="h-3 w-3 text-red-400" />
							{/if}
						</div>
						<span class="text-slate-300">{item.label}</span>
						{#if item.note}
							<span class="text-xs text-slate-500">({item.note})</span>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Action Button -->
	<div class="text-center">
		{#if activeTab === 'visit'}
			{#if canVisit}
				{#if visitorRequestSubmitted}
					<!-- Success Message -->
					<div class="rounded-lg border border-green-500/30 bg-green-500/10 p-6">
						<div
							class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20"
						>
							<IconCheck class="h-6 w-6 text-green-400" />
						</div>
						<h3 class="mb-2 text-lg font-semibold text-white">Request Submitted!</h3>
						<p class="text-sm text-slate-300">
							Your visitor request has been submitted successfully. It may take up to 5 minutes for
							the roster changes to take effect.
						</p>
						<div class="mt-3 flex items-center justify-center gap-2 text-xs text-slate-400">
							<IconClock class="h-3 w-3" />
							<span>Please allow time for processing</span>
						</div>
					</div>
				{:else}
					<form
						action="?/addVisitor"
						method="POST"
						use:enhance={() => {
							return async ({ result }) => {
								if (result.type === 'success') {
									visitorRequestSubmitted = true;
								}
							};
						}}
					>
						<button
							class="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-sky-700"
						>
							<IconAccount class="h-4 w-4" />
							Request to Visit Indy Center
						</button>
					</form>
				{/if}
			{:else}
				<button
					disabled
					class="inline-flex cursor-not-allowed items-center gap-2 rounded-lg bg-slate-600 px-6 py-3 text-sm font-medium text-slate-400"
				>
					<IconClose class="h-4 w-4" />
					Not Eligible to Visit
				</button>
			{/if}
		{:else if canTransfer}
			<!-- USA division users can transfer -->
			<a
				href="https://www.vatusa.net/my/profile"
				target="_blank"
				rel="noopener noreferrer"
				class="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-green-700"
			>
				<IconAccountSwitch class="h-4 w-4" />
				Transfer to Indy Center
			</a>
		{:else}
			<button
				disabled
				class="inline-flex cursor-not-allowed items-center gap-2 rounded-lg bg-slate-600 px-6 py-3 text-sm font-medium text-slate-400"
			>
				<IconClose class="h-4 w-4" />
				Not Eligible to Transfer
			</button>
		{/if}
	</div>
</div>

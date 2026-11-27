<script lang="ts">
	import { enhance } from '$app/forms';
	import { Alert, Button, Heading, Icon, Link, Text } from '@indy-center/centerline-svelte';
	import { mdiAccount, mdiAccountSwitch, mdiCheckCircle, mdiCloseCircle } from '@mdi/js';
	import type { VatusaTransferChecklist } from '$lib/types/vatusa';

	interface Props {
		checklist: VatusaTransferChecklist;
		canVisit: boolean;
		canTransfer: boolean;
		/** The heading level for its requirement lists, from the page's outline */
		level?: 3 | 4;
	}

	const { checklist, canVisit, canTransfer, level = 3 }: Props = $props();

	const visitingItems = $derived([
		{ key: 'hasHome', label: 'Has a home facility', value: checklist.hasHome },
		{ key: 'needbasic', label: 'Basic exam complete', value: checklist.needbasic },
		{ key: '50hrs', label: '50+ hours since promotion', value: checklist['50hrs'] },
		{ key: 'promo', label: '90+ days since promotion', value: checklist.promo },
		{ key: 'hasRating', label: 'S3 rating or higher', value: checklist.hasRating }
	]);

	// Matches the server's transfer checks
	const transferItems = $derived([
		{ key: 'needbasic', label: 'Basic exam complete', value: checklist.needbasic },
		{ key: '90days', label: '90+ days since last transfer', value: checklist['90days'] },
		{ key: '50hrs', label: '50+ hours since promotion', value: checklist['50hrs'] },
		{ key: 'staff', label: 'No staff position', value: checklist.staff },
		{ key: 'instructor', label: 'Not an I1 or I3', value: checklist.instructor },
		{ key: 'pending', label: 'No pending transfers', value: checklist.pending }
	]);

	let activeTab = $state<'visit' | 'transfer'>('visit');
	let visitorRequestSubmitted = $state(false);
</script>

{#snippet requirements(title: string, items: { key: string; label: string; value: boolean }[])}
	<Heading {level} look={4} class="mb-3">{title}</Heading>
	<ul class="flex flex-col gap-2">
		{#each items as item (item.key)}
			<li class="flex items-center gap-3 rounded-lg bg-muted px-3 py-2 text-sm">
				<!-- Met or not, said in words as well as by the icon's colour -->
				<Icon
					path={item.value ? mdiCheckCircle : mdiCloseCircle}
					label={item.value ? 'Met' : 'Not met'}
					class="shrink-0 {item.value ? 'text-success' : 'text-destructive'}"
				/>
				<span class="text-foreground">{item.label}</span>
			</li>
		{/each}
	</ul>
{/snippet}

<div class="flex flex-col gap-4">
	<div class="grid grid-cols-2 gap-2" role="group" aria-label="Visit or transfer">
		<Button
			variant="secondary"
			pressed={activeTab === 'visit'}
			onclick={() => (activeTab = 'visit')}
		>
			<Icon path={mdiAccount} />
			Visit ({canVisit ? 'eligible' : 'not yet'})
		</Button>
		<Button
			variant="secondary"
			pressed={activeTab === 'transfer'}
			onclick={() => (activeTab = 'transfer')}
		>
			<Icon path={mdiAccountSwitch} />
			Transfer ({canTransfer ? 'eligible' : 'not yet'})
		</Button>
	</div>

	{#if activeTab === 'visit'}
		{@render requirements('Visiting requirements', visitingItems)}
		{#if !canVisit}
			<Button disabled>Not eligible to visit yet</Button>
		{:else if visitorRequestSubmitted}
			<Alert level="success" title="Request sent">
				It can take up to 5 minutes for the roster to show the change.
			</Alert>
		{:else}
			<form
				action="?/addVisitor"
				method="POST"
				use:enhance={() =>
					async ({ result }) => {
						if (result.type === 'success') visitorRequestSubmitted = true;
					}}
			>
				<Button type="submit">
					<Icon path={mdiAccount} />
					Ask to visit Indy Center
				</Button>
			</form>
		{/if}
	{:else}
		{@render requirements('Transfer requirements', transferItems)}
		{#if canTransfer}
			<!-- Transfers are requested on VATUSA -->
			<div>
				<Button href="https://www.vatusa.net/my/profile" target="_blank" rel="noopener noreferrer">
					<Icon path={mdiAccountSwitch} />
					Transfer on VATUSA (new tab)
				</Button>
			</div>
		{:else}
			<Button disabled>Not eligible to transfer yet</Button>
		{/if}
	{/if}

	<Text size="small">
		If any of these look wrong, ask on the
		<Link href="https://discord.indy.center" target="_blank" rel="noopener noreferrer"
			>Indy Center Discord (new tab)</Link
		>.
	</Text>
</div>

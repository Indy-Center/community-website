<script lang="ts">
	import {
		Alert,
		Button,
		Card,
		DescriptionList,
		Heading,
		Icon,
		PageHeader,
		Panel,
		Text
	} from '@indy-center/centerline-svelte';
	import { mdiAccount, mdiClockOutline, mdiEye, mdiSchool, mdiToolbox } from '@mdi/js';
	import EligibilityChecklist from '$lib/components/EligibilityChecklist.svelte';
	import { isAdmin } from '$lib/utils/permissions';

	const { data } = $props();
	const { user } = data;

	type Status = 'not-controller' | 'qualified-controller' | 'already-controller';

	// Admins can preview the page as each kind of visitor sees it
	let adminPreviewMode: Status | null = $state(null);

	const controllerStatus = $derived.by((): Status => {
		if (isAdmin(data?.roles) && adminPreviewMode) return adminPreviewMode;
		if (!user) return 'not-controller';
		if (user.membership === 'controller') return 'already-controller';
		// Community members rated S1 or higher with a home facility on file can visit or transfer,
		// whatever their division
		if (user.membership === 'community' && user.data.vatsim.rating.id >= 2) {
			return data.checklist?.hasHome ? 'qualified-controller' : 'not-controller';
		}
		// OBS or no membership: join VATUSA first
		return 'not-controller';
	});

	const description = $derived(
		controllerStatus === 'not-controller'
			? 'Getting into controlling on VATSIM is one of the best ways to learn more about flying. Learning to control at Indy Center means you get to invest time in yourself as well as your community.'
			: 'Becoming a controller at Indy Center is easy. We enjoy being able to offer a very nearly completely unrestricted controlling facility. Controllers on roster can control any non-center position immediately.'
	);

	const PREVIEWS: { mode: Status | null; label: string }[] = [
		{ mode: null, label: 'Live' },
		{ mode: 'not-controller', label: 'Not a controller' },
		{ mode: 'qualified-controller', label: 'Qualified' },
		{ mode: 'already-controller', label: 'Already a controller' }
	];
</script>

<svelte:head>
	<title>Become a controller | Indy Center</title>
</svelte:head>

<PageHeader title="Become an Indy Center controller" class="mb-8">
	{description}
</PageHeader>

{#if isAdmin(data?.roles)}
	<div class="mb-6 flex flex-wrap items-center gap-2" role="group" aria-label="Admin preview">
		<Text as="span" size="small" class="flex items-center gap-1">
			<Icon path={mdiEye} />
			Admin preview:
		</Text>
		{#each PREVIEWS as preview (preview.label)}
			<Button
				variant="secondary"
				size="sm"
				pressed={adminPreviewMode === preview.mode}
				onclick={() => (adminPreviewMode = preview.mode)}
			>
				{preview.label}
			</Button>
		{/each}
	</div>
{/if}

<div class="mx-auto max-w-4xl">
	{#if controllerStatus === 'already-controller'}
		<Alert level="success" title="You're already a controller here">
			Thanks for being on the Indy Center roster.
		</Alert>
	{:else if controllerStatus === 'qualified-controller' && data.checklist}
		<div class="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
			<Panel title="Our controllers use great tools" level={2}>
				{#snippet icon()}<Icon path={mdiToolbox} />{/snippet}
				<ul class="flex flex-col gap-3">
					<Card as="li" class="relative">
						<Heading level={3} look={4}>
							<a
								href="https://tools.flyindycenter.com"
								class="after:absolute after:inset-0 hover:underline focus-visible:outline-none focus-visible:after:rounded-lg focus-visible:after:outline-2 focus-visible:after:outline-ring"
								>Controller tools</a
							>
						</Heading>
						<Text size="small" class="mt-1">
							Custom tools for easier controlling and radar restrictions.
						</Text>
					</Card>
					<Card as="li" class="relative">
						<Heading level={3} look={4}>
							<a
								href="https://wiki.flyindycenter.com"
								class="after:absolute after:inset-0 hover:underline focus-visible:outline-none focus-visible:after:rounded-lg focus-visible:after:outline-2 focus-visible:after:outline-ring"
								>Indy library</a
							>
						</Heading>
						<Text size="small" class="mt-1">
							Rich online document library with easy-to-learn SOPs.
						</Text>
					</Card>
				</ul>

				<Heading level={3} look={4} class="mt-6 mb-3 flex items-center gap-2">
					<Icon path={mdiClockOutline} class="text-muted-foreground" />
					Hour requirements
				</Heading>
				<DescriptionList>
					<div>
						<dt>Home controllers</dt>
						<dd>3 hours per quarter</dd>
					</div>
					<div>
						<dt>Visiting controllers</dt>
						<dd>1 hour per quarter</dd>
					</div>
				</DescriptionList>
			</Panel>

			<Panel title="Your eligibility" level={2}>
				{#snippet icon()}<Icon path={mdiAccount} />{/snippet}
				<EligibilityChecklist
					checklist={data.checklist}
					canVisit={data.canVisit}
					canTransfer={data.canTransfer}
				/>
			</Panel>
		</div>
	{:else}
		<Panel title="Start with VATUSA" level={2}>
			{#snippet icon()}<Icon path={mdiSchool} />{/snippet}
			<Text class="mb-4">
				Your first step is joining VATUSA, VATSIM's US division. Then come back here to see whether
				you can visit or transfer.
			</Text>
			<Button href="https://www.vatusa.net/info/join" target="_blank" rel="noopener noreferrer">
				<Icon path={mdiSchool} />
				Join VATUSA (new tab)
			</Button>
		</Panel>
	{/if}
</div>

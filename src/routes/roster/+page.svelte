<script lang="ts">
	import { parseISO, formatDistanceToNow } from 'date-fns';
	import {
		Badge,
		Button,
		Card,
		Chip,
		Credential,
		EmptyState,
		FilterChip,
		Frequency,
		Icon,
		Member,
		PageHeader,
		Rating,
		SearchInput,
		Text
	} from '@indy-center/centerline-svelte';
	import {
		mdiAccountSearch,
		mdiArrowDown,
		mdiArrowUp,
		mdiCog,
		mdiTransmissionTower
	} from '@mdi/js';
	import StaffBadges from '$lib/components/StaffBadges.svelte';
	import type { VnasController } from '$lib/types/vnas.js';
	import { credentialName, credentialOrder } from '$lib/credentials';

	let { data } = $props();

	const { controllers, staffBadges, credentials } = data;

	let searchTerm = $state('');
	let sortField = $state<string>('initials');
	let sortDirection = $state<'asc' | 'desc'>('asc');
	let showOnlineOnly = $state(false);

	const SORT_OPTIONS = [
		{
			key: 'initials',
			label: 'Initials'
		},
		{
			key: 'name',
			label: 'Name'
		},
		{
			key: 'rating',
			label: 'Rating'
		},
		{
			key: 'certification',
			label: 'Certification'
		},
		{
			key: 'joined',
			label: 'Joined'
		}
	];

	function getRatingOrder(rating: string): number {
		const ratingOrder = ['OBS', 'S1', 'S2', 'S3', 'C1', 'C3', 'I1', 'I3', 'SUP'];
		const index = ratingOrder.indexOf(rating);
		return index === -1 ? 999 : index;
	}

	// getCertificationOrder function imported from centralized config

	function handleSort(field: string) {
		if (sortField === field) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortField = field;
			sortDirection = 'asc';
		}
	}

	function formatSince(dateString: string | null): string {
		if (!dateString) return '';
		const date = parseISO(dateString);
		return formatDistanceToNow(date, { addSuffix: false });
	}

	function getOnlineStatus(cid: string) {
		const onlineController: VnasController | undefined = controllers.find(
			(controller) => controller.vatsimData.cid.toString() === cid.toString()
		);

		if (onlineController) {
			const primaryPosition = onlineController.positions?.find((pos) => pos.isPrimary);
			return {
				isOnline: true,
				callsign: primaryPosition?.radioName,
				frequency: primaryPosition?.frequency,
				loginTime: parseISO(onlineController.loginTime)
			};
		}

		return { isOnline: false, callsign: null, frequency: null, loginTime: null };
	}

	let filteredAndSortedRoster = $derived(
		(() => {
			if (!data.roster || !Array.isArray(data.roster)) {
				return [];
			}

			// Filter first
			const filtered = data.roster.filter((member) => {
				const matchesSearch =
					searchTerm === '' ||
					member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
					member.cid.includes(searchTerm);

				const onlineStatus = getOnlineStatus(member.cid);
				const matchesOnlineFilter = !showOnlineOnly || onlineStatus.isOnline;

				return matchesSearch && matchesOnlineFilter;
			});

			// Then sort
			return filtered.sort((a, b) => {
				let aVal: any, bVal: any;

				switch (sortField) {
					case 'name':
						aVal = a.name.toLowerCase();
						bVal = b.name.toLowerCase();
						break;
					case 'rating':
						aVal = getRatingOrder(a.rating);
						bVal = getRatingOrder(b.rating);
						break;
					case 'certification':
						aVal = credentialOrder(credentials, a.certification);
						bVal = credentialOrder(credentials, b.certification);
						break;
					case 'initials':
						aVal = (a.operatingInitials || 'ZZZ').toLowerCase();
						bVal = (b.operatingInitials || 'ZZZ').toLowerCase();
						break;
					case 'joined':
						// VATUSA may not say when a member joined; they sort as the earliest
						aVal = a.joined ? new Date(a.joined) : new Date(0);
						bVal = b.joined ? new Date(b.joined) : new Date(0);
						break;
					default:
						return 0;
				}

				if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
				if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
				return 0;
			});
		})()
	);
</script>

<svelte:head>
	<title>Roster | Indy Center</title>
</svelte:head>

<PageHeader title="Controller roster" class="mb-8">
	The active home and visiting controllers of Indy Center.
</PageHeader>

<div class="mb-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
	<div class="flex flex-wrap items-end gap-2">
		<SearchInput
			label="Search the roster"
			hideLabel
			bind:value={searchTerm}
			placeholder="Name or CID"
			class="w-full md:w-64"
		/>
		<FilterChip bind:pressed={showOnlineOnly}>Online now</FilterChip>
	</div>

	<div class="flex flex-wrap items-center gap-2" role="group" aria-label="Sort by">
		<Text as="span" size="small">Sort by</Text>
		{#each SORT_OPTIONS as option (option.key)}
			{@const active = sortField === option.key}
			<Button
				variant="secondary"
				size="sm"
				pressed={active}
				onclick={() => handleSort(option.key)}
				aria-label={active
					? `${option.label}, ${sortDirection === 'asc' ? 'ascending' : 'descending'}`
					: option.label}
			>
				{option.label}
				{#if active}
					<Icon path={sortDirection === 'asc' ? mdiArrowUp : mdiArrowDown} />
				{/if}
			</Button>
		{/each}
	</div>
</div>

<ul class="flex flex-col gap-2">
	{#each filteredAndSortedRoster as member (member.cid)}
		{@const onlineStatus = getOnlineStatus(member.cid)}
		<Card as="li" class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
			<div class="flex min-w-0 flex-1 flex-wrap items-center gap-2">
				<!-- Operating initials, with their space kept so names line up -->
				<span class="flex w-12 shrink-0">
					{#if member.operatingInitials}
						<Chip variant="initials">{member.operatingInitials}</Chip>
					{/if}
				</span>
				<span class="min-w-0 font-semibold text-foreground">
					<Member name={member.name} cid={member.cid} href="/profile/{member.cid}" />
				</span>
				{#if member.userId}
					<a
						href="/admin/users/{member.userId}"
						aria-label="Manage {member.name}"
						class="inline-flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
					>
						<Icon path={mdiCog} />
					</a>
				{/if}
				<Rating rating={member.rating} />
				<StaffBadges badges={staffBadges[member.cid] ?? []} />
				{#if member.certification}
					<Credential
						kind="certification"
						code={member.certification}
						name={credentialName(credentials, member.certification)}
					/>
				{/if}
				{#each member.endorsements as endorsement (endorsement)}
					<Credential
						kind="endorsement"
						code={endorsement}
						name={credentialName(credentials, endorsement)}
					/>
				{/each}
				{#if onlineStatus.isOnline}
					<Badge variant="green" size="sm" pill>
						{#snippet icon()}<Icon path={mdiTransmissionTower} />{/snippet}
						Online{onlineStatus.callsign ? ` on ${onlineStatus.callsign}` : ''}
						{#if onlineStatus.frequency}
							· <Frequency value={onlineStatus.frequency} />
						{/if}
					</Badge>
				{/if}
			</div>
			{#if member.joined}
				<Text as="span" size="small" class="shrink-0 md:ml-4 md:text-right">
					Joined {formatSince(member.joined)} ago
				</Text>
			{/if}
		</Card>
	{:else}
		<li>
			<EmptyState title="No controllers found" level={2}>
				{#snippet icon()}<Icon path={mdiAccountSearch} />{/snippet}
				{showOnlineOnly
					? 'Nobody on the roster matches that while online. Turn off "Online now" to see everyone.'
					: 'Nobody on the roster matches that search.'}
			</EmptyState>
		</li>
	{/each}
</ul>

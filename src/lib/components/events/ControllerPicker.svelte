<script lang="ts">
	import { tick } from 'svelte';
	import { Combobox } from '@indy-center/centerline-svelte';

	type PickerUser = {
		id: string;
		cid: string;
		firstName: string;
		lastName: string;
		preferredName: string | null;
		operatingInitials: string | null;
	};

	let {
		name,
		users,
		value = '',
		onselect
	}: {
		name: string;
		users: PickerUser[];
		value?: string | null;
		/** Runs once a different controller (or Unassigned) is picked, with the picker's form */
		onselect: (form: HTMLFormElement | null) => void;
	} = $props();

	// "Unassigned" is an option of its own, so picking it sends an empty id
	const UNASSIGNED: PickerUser = {
		id: '',
		cid: '',
		firstName: 'Unassigned',
		lastName: '',
		preferredName: 'Unassigned',
		operatingInitials: null
	};

	const displayName = (user: PickerUser) =>
		user.preferredName || `${user.firstName} ${user.lastName}`;

	const sortedUsers = $derived(
		[...users].sort((a, b) =>
			displayName(a).localeCompare(displayName(b), undefined, { sensitivity: 'base' })
		)
	);

	// Matches display name, legal name, operating initials, or CID; an exact initials match first
	function search(query: string) {
		const q = query.trim().toLowerCase();
		if (!q) return [UNASSIGNED, ...sortedUsers];
		const matches = sortedUsers.filter((u) =>
			[displayName(u), `${u.firstName} ${u.lastName}`, u.operatingInitials ?? '', u.cid].some(
				(field) => field.toLowerCase().includes(q)
			)
		);
		const exact = matches.filter((u) => u.operatingInitials?.toLowerCase() === q);
		return [...exact, ...matches.filter((u) => u.operatingInitials?.toLowerCase() !== q)];
	}

	const saved = $derived(users.find((u) => u.id === value) ?? UNASSIGNED);
	let picked = $state<PickerUser | null>(null);
	let box: HTMLSpanElement | undefined = $state();

	// Sends the form once the pick differs from what's saved
	$effect(() => {
		if (!picked || picked.id === (value ?? '')) return;
		tick().then(() => onselect(box?.closest('form') ?? null));
	});
</script>

<span bind:this={box} class="block min-w-56">
	<Combobox
		aria-label="Assigned controller"
		{name}
		options={search}
		getText={displayName}
		getKey={(user) => user.id}
		defaultValue={saved}
		bind:value={picked}
	>
		{#snippet option(user)}
			<span class="flex-1 truncate">{displayName(user)}</span>
			{#if user.id}
				<span class="font-mono text-sm text-muted-foreground">
					{user.operatingInitials ?? '--'}
				</span>
			{/if}
		{/snippet}
	</Combobox>
</span>

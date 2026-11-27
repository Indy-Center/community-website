<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { Combobox } from '@indy-center/centerline-svelte';
	import type { PickableShownMember } from '$lib/members';

	type SearchUser = PickableShownMember;

	let {
		name,
		users,
		value = $bindable(''),
		...rest
	}: {
		name: string;
		users: SearchUser[];
		/** The picked member's id; empty for none */
		value?: string;
	} & Omit<HTMLInputAttributes, 'value' | 'name'> = $props();

	// Matches the shown name, VATSIM name (unless it's private), operating initials, or CID; an
	// exact initials or CID match first. The load works the name out, honouring name privacy.
	function search(query: string) {
		const q = query.trim().toLowerCase();
		if (!q) return users;
		const matches = users.filter((u) =>
			[u.name, u.vatsimName ?? '', u.operatingInitials ?? '', u.cid].some((field) =>
				field.toLowerCase().includes(q)
			)
		);
		const isExact = (u: SearchUser) => u.operatingInitials?.toLowerCase() === q || u.cid === q;
		return [...matches.filter(isExact), ...matches.filter((u) => !isExact(u))];
	}
</script>

<Combobox
	{...rest}
	{name}
	options={search}
	getText={(user) => user.name}
	getKey={(user) => user.id}
	bind:value={() => users.find((u) => u.id === value) ?? null, (user) => (value = user?.id ?? '')}
>
	{#snippet option(user)}
		<span class="flex-1 truncate">{user.name}</span>
		<span class="font-mono text-sm text-muted-foreground">
			{user.operatingInitials ?? user.cid}
		</span>
	{/snippet}
</Combobox>

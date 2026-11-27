<script lang="ts">
	import {
		Badge,
		Chip,
		EmptyState,
		Link,
		PageHeader,
		SearchInput,
		Table,
		Text,
		Th,
		type BadgeVariant
	} from '@indy-center/centerline-svelte';
	import MembershipBadge from '$lib/components/MembershipBadge.svelte';
	import type { User } from '$lib/db/schema/users.js';

	let { data } = $props();

	let searchQuery = $state('');

	const filteredUsers = $derived.by(() => {
		const users = Array.isArray(data.users) ? data.users : [];
		const q = searchQuery.trim().toLowerCase();
		if (!q) return users;
		return users.filter(
			(user) =>
				user.firstName.toLowerCase().includes(q) ||
				user.lastName.toLowerCase().includes(q) ||
				user.preferredName?.toLowerCase().includes(q) ||
				user.email.toLowerCase().includes(q) ||
				user.cid.includes(q) ||
				user.operatingInitials?.toLowerCase().includes(q)
		);
	});

	const totalUsers = $derived(data.users?.length ?? 0);

	const getDisplayName = (user: User) => user.preferredName || `${user.firstName} ${user.lastName}`;

	const ROLE_VARIANTS: Record<string, BadgeVariant> = {
		admin: 'red',
		'events:manage': 'purple',
		'users:manage': 'blue'
	};
</script>

<svelte:head>
	<title>Users | Admin | Indy Center</title>
</svelte:head>

<PageHeader title="Users" class="mb-6">
	Accounts, memberships and roles for the {totalUsers} people who have signed in.
</PageHeader>

<SearchInput
	label="Search users"
	hideLabel
	bind:value={searchQuery}
	placeholder="Name, email, CID or operating initials"
	class="mb-4 max-w-md"
/>

{#if filteredUsers.length > 0}
	<Table>
		{#snippet caption()}
			{searchQuery
				? `${filteredUsers.length} of ${totalUsers} users matching "${searchQuery}"`
				: `${totalUsers} users`}
		{/snippet}
		<thead>
			<tr>
				<Th scope="col">User</Th>
				<Th scope="col">Membership</Th>
				<Th scope="col">Roles</Th>
			</tr>
		</thead>
		<tbody>
			{#each filteredUsers as user (user.id)}
				<tr>
					<td>
						<Link href="/admin/users/{user.id}">{getDisplayName(user)}</Link>
						<div class="mt-0.5 flex items-center gap-2">
							<span class="font-mono text-xs text-muted-foreground">CID {user.cid}</span>
							{#if user.operatingInitials}
								<Chip variant="initials">{user.operatingInitials}</Chip>
							{/if}
						</div>
					</td>
					<td><MembershipBadge size="sm" membership={user.membership} /></td>
					<td>
						{#if user.roles.length > 0}
							<div class="flex flex-wrap gap-1">
								{#each user.roles as roleObj (roleObj.role)}
									<Badge size="sm" variant={ROLE_VARIANTS[roleObj.role] ?? 'gray'}>
										<span class="font-mono">{roleObj.role}</span>
									</Badge>
								{/each}
							</div>
						{:else}
							<Text as="span" size="small">No roles</Text>
						{/if}
					</td>
				</tr>
			{/each}
		</tbody>
	</Table>
{:else}
	<EmptyState size="inline">
		{searchQuery ? `No users match "${searchQuery}".` : 'No users yet.'}
	</EmptyState>
{/if}

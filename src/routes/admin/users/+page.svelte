<script lang="ts">
	import IconAccount from '~icons/mdi/account';
	import IconEmail from '~icons/mdi/email';
	import IconUsers from '~icons/mdi/account-group';
	import MembershipBadge from '$lib/components/MembershipBadge.svelte';
	import { goto } from '$app/navigation';
	import type { User } from '$lib/db/schema/users.js';
	import Badge from '$lib/components/Badge.svelte';

	let { data } = $props();

	let searchQuery = $state('');

	const filteredUsers = $derived.by(() => {
		if (!data.users || !Array.isArray(data.users)) {
			return [];
		}

		const { users } = data;

		if (searchQuery.trim()) {
			return users.filter(
				(user) =>
					user.firstName.toLowerCase().includes(searchQuery) ||
					user.lastName.toLowerCase().includes(searchQuery) ||
					(user.preferredName && user.preferredName.toLowerCase().includes(searchQuery)) ||
					user.email.toLowerCase().includes(searchQuery) ||
					user.cid.includes(searchQuery) ||
					(user.operatingInitials && user.operatingInitials.toLowerCase().includes(searchQuery))
			);
		}

		return users;
	});

	const totalUsers = data.users ? data.users.length : 0;

	function clearSearch() {
		searchQuery = '';
	}

	function getDisplayName(user: User): string {
		return user.preferredName || `${user.firstName} ${user.lastName}`;
	}

	function getRoleBadgeColor(role: string): string {
		switch (role) {
			case 'admin':
				return 'bg-red-600/20 text-red-300 border-red-500/30';
			case 'events:manage':
				return 'bg-purple-600/20 text-purple-300 border-purple-500/30';
			case 'users:manage':
				return 'bg-blue-600/20 text-blue-300 border-blue-500/30';
			default:
				return 'bg-gray-600/20 text-gray-300 border-gray-500/30';
		}
	}
</script>

<svelte:head>
	<title>User Management - Admin - Indy Center</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h2 class="text-2xl font-semibold text-white">User Management</h2>
			<p class="mt-1 text-sm text-gray-400">Manage user accounts, roles, and permissions</p>
		</div>
		<div class="flex items-center space-x-2 text-sm text-gray-400">
			<IconUsers class="h-4 w-4" />
			<span>{totalUsers} users</span>
		</div>
	</div>

	<!-- Search -->
	<div class="flex items-center gap-2">
		<input
			type="text"
			placeholder="Search by name, email, CID, or operating initials..."
			bind:value={searchQuery}
			class="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-3 text-sm text-white placeholder-gray-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500 focus:outline-none md:py-2"
		/>
		{#if searchQuery}
			<button
				type="button"
				onclick={clearSearch}
				class="rounded-lg border border-slate-600 bg-slate-700 px-3 py-3 text-sm text-white hover:bg-slate-600 focus:border-sky-500 focus:ring-2 focus:ring-sky-500 focus:outline-none md:py-2"
			>
				Clear
			</button>
		{/if}
	</div>

	<!-- Users Table -->
	<div class="overflow-hidden rounded-lg border border-slate-700/50 bg-slate-800/50">
		<div class="overflow-x-auto">
			<table class="w-full">
				<thead class="border-b border-slate-600/50 bg-slate-700/50">
					<tr>
						<th class="px-4 py-3 text-left text-sm font-medium text-gray-300">User</th>
						<th class="px-4 py-3 text-left text-sm font-medium text-gray-300">Membership</th>
						<th class="px-4 py-3 text-left text-sm font-medium text-gray-300">Roles</th>
						<th class="px-4 py-3 text-left text-sm font-medium text-gray-300">Certifications</th>
						<th class="px-4 py-3 text-left text-sm font-medium text-gray-300">Endorsements</th>
					</tr>
				</thead>
				<tbody>
					{#each filteredUsers as user, index (user.id)}
						<tr
							class="cursor-pointer border-b border-slate-700/30 transition-colors duration-200 hover:bg-slate-700/30"
							onclick={() => {
								goto(`/admin/users/${user.id}`);
							}}
						>
							<td class="px-4 py-4">
								<div class="flex items-center space-x-3">
									<IconAccount class="h-8 w-8 flex-shrink-0 text-gray-400" />
									<div>
										<div class="text-sm font-medium text-white">{getDisplayName(user)}</div>
										<div class="font-mono text-xs text-gray-400">CID: {user.cid}</div>
										{#if user.operatingInitials}
											<div class="text-xs text-sky-400">{user.operatingInitials}</div>
										{/if}
									</div>
								</div>
							</td>
							<td class="px-4 py-4">
								<MembershipBadge size="sm" membership={user.membership} />
							</td>
							<td class="px-4 py-4">
								{#if user.roles.length > 0}
									<div class="flex flex-wrap gap-1">
										{#each user.roles as roleObj}
											<span
												class="rounded border px-2 py-1 font-mono text-xs {getRoleBadgeColor(
													roleObj.role
												)}"
											>
												{roleObj.role}
											</span>
										{/each}
									</div>
								{:else}
									<span class="text-xs text-gray-500 italic">No roles</span>
								{/if}
							</td>
							<td class="px-4 py-4">
								<div class="flex flex-wrap gap-2 text-xs">
									{#each user.certifications as certification}
										<Badge size="sm" label={certification.certification} />
									{/each}
								</div>
							</td>
							<td class="px-4 py-4">
								<div class="flex flex-wrap gap-2 text-xs">
									{#each user.endorsements as endorsement}
										<Badge size="sm" label={endorsement.endorsement} />
									{/each}
								</div>
							</td>
						</tr>
					{:else}
						<tr>
							<td colspan="5" class="px-4 py-8 text-center text-gray-400">
								{#if searchQuery}
									No users found matching "{searchQuery}".
								{:else}
									No users found.
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	<!-- Results Summary -->
	{#if searchQuery}
		<div class="text-sm text-gray-400">
			Showing {filteredUsers.length} of {totalUsers} users for "{searchQuery}"
		</div>
	{/if}
</div>

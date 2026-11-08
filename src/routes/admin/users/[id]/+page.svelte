<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import IconAccount from '~icons/mdi/account';
	import MembershipBadge from '$lib/components/MembershipBadge.svelte';
	import type { User } from '$lib/db/schema/users';
	import { credentialName, credentialOrder } from '$lib/credentials';
	import { Role } from '$lib/utils/permissions';

	let { data } = $props();

	const user = $derived.by(() => data.user as User & { roles: { role: string }[] });

	function getDisplayName(user: User): string {
		return user.preferredName || `${user.firstName} ${user.lastName}`;
	}

	function getRoleBadgeColor(role: string): string {
		switch (role) {
			case Role.ADMIN:
				return 'bg-red-600/20 text-red-300 border-red-500/30';
			case Role.CAN_MANAGE_EVENTS:
				return 'bg-purple-600/20 text-purple-300 border-purple-500/30';
			case Role.EVENTS_PROHIBIT_SIGNUP:
				return 'bg-orange-600/20 text-orange-300 border-orange-500/30';
			default:
				return 'bg-gray-600/20 text-gray-300 border-gray-500/30';
		}
	}

	const endorsements = $derived(
		[...(data.held?.endorsements ?? [])].sort(
			(a, b) => credentialOrder(data.credentials, a) - credentialOrder(data.credentials, b)
		)
	);

	function hasRole(role: string): boolean {
		return user.roles.some((r) => r.role === role);
	}

	// Roles that can be manually managed by admins (excludes VATUSA auto-managed roles)
	const permissionRoles = [
		{ key: Role.ADMIN, label: 'Administrator', description: 'Full system access' },
		{
			key: Role.CAN_MANAGE_EVENTS,
			label: 'Manage Events',
			description: 'Can create and edit events'
		}
	];

	const restrictionRoles = [
		{
			key: Role.EVENTS_PROHIBIT_SIGNUP,
			label: 'Prohibit Event Signup',
			description: 'Cannot sign up for event positions'
		}
	];
</script>

<svelte:head>
	<title>{getDisplayName(user)} - User Management - Admin - Indy Center</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-semibold text-white">{getDisplayName(user)}</h1>
			<p class="text-sm text-gray-400">
				Manage this user's roles. Certifications and endorsements are edited in the training app.
			</p>
		</div>
		<div>
			<a
				href={`https://www.vatusa.net/mgt/controller/${user.cid}`}
				target="_blank"
				class="rounded-lg bg-sky-600/20 px-4 py-2 text-sm text-sky-300 hover:bg-sky-600/30"
			>
				Manage in VATUSA
			</a>
		</div>
	</div>

	<!-- User Information Card -->
	<div class="rounded-lg border border-slate-700/50 bg-slate-800/50 p-6">
		<div class="flex items-start space-x-4">
			<IconAccount class="h-12 w-12 flex-shrink-0 text-gray-400" />
			<div class="flex-1 space-y-4">
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
					<div>
						<div class="text-sm text-gray-400">Name</div>
						<div class="text-white">{getDisplayName(user)}</div>
					</div>
					<div>
						<div class="text-sm text-gray-400">CID</div>
						<div class="font-mono text-white">{user.cid}</div>
					</div>
					<div>
						<div class="text-sm text-gray-400">Operating Initials</div>
						<div class="text-sky-400">{user.operatingInitials || 'Not set'}</div>
					</div>
					<div>
						<div class="text-sm text-gray-400">Email</div>
						<div class="text-white">{user.email}</div>
					</div>
					<div>
						<div class="text-sm text-gray-400">Membership</div>
						<MembershipBadge size="sm" membership={user.membership} />
					</div>
					<div>
						<div class="text-sm text-gray-400">Rating</div>
						<div class="font-mono text-sm text-sky-400">
							{user.data.vatsim.rating.short || 'Unknown'}
						</div>
					</div>
				</div>

				{#if user.roles.length > 0}
					<div>
						<div class="mb-2 text-sm text-gray-400">System Roles</div>
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
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Certification and endorsements, read-only: the training app owns them -->
	<div class="rounded-lg border border-slate-700/50 bg-slate-800/50 p-6">
		<div class="mb-4 flex items-start justify-between gap-4">
			<div>
				<h2 class="text-lg font-semibold text-white">Certification & Endorsements</h2>
				<p class="text-sm text-gray-400">As last stored from the training app</p>
			</div>
			{#if data.held}
				<a
					href={`https://training.flyindycenter.com/certifications/${user.cid}`}
					target="_blank"
					rel="noopener"
					class="shrink-0 rounded-lg bg-sky-600/20 px-4 py-2 text-sm text-sky-300 hover:bg-sky-600/30"
				>
					Edit in the training app
				</a>
			{/if}
		</div>

		{#if data.held}
			<div class="space-y-4">
				<div>
					<div class="mb-2 text-sm text-gray-400">Certification</div>
					{#if data.held.certification}
						<div class="text-white">
							<span class="font-mono text-green-300">{data.held.certification}</span>
							<span class="text-sm text-gray-400">
								{credentialName(data.credentials, data.held.certification)}
							</span>
						</div>
					{:else}
						<div class="text-sm text-gray-500 italic">No certification</div>
					{/if}
				</div>
				<div>
					<div class="mb-2 text-sm text-gray-400">Endorsements</div>
					{#if endorsements.length > 0}
						<ul class="space-y-1">
							{#each endorsements as endorsement (endorsement)}
								<li class="text-white">
									<span class="font-mono text-sky-300">{endorsement}</span>
									<span class="text-sm text-gray-400">
										{credentialName(data.credentials, endorsement)}
									</span>
								</li>
							{/each}
						</ul>
					{:else}
						<div class="text-sm text-gray-500 italic">No endorsements</div>
					{/if}
				</div>
			</div>
		{:else}
			<p class="text-sm text-gray-400">This user isn't on the controller roster.</p>
		{/if}
	</div>

	<!-- Roles Management -->
	<div class="rounded-lg border border-slate-700/50 bg-slate-800/50 p-6">
		<div class="mb-6">
			<h2 class="text-lg font-semibold text-white">System Roles</h2>
			<p class="text-sm text-gray-400">Manage permissions and restrictions for this user</p>
		</div>

		<!-- Permissions -->
		<div class="mb-6">
			<h3 class="mb-3 text-sm font-semibold text-slate-300">Permissions</h3>
			<div class="space-y-2">
				{#each permissionRoles as roleItem}
					<form
						method="POST"
						action="?/toggleRole"
						use:enhance={() => {
							return async ({ result }) => {
								if (result.type === 'success') {
									await invalidateAll();
								}
							};
						}}
						class="block"
					>
						<input type="hidden" name="role" value={roleItem.key} />
						<button
							type="submit"
							class="w-full cursor-pointer rounded-lg border px-4 py-3 text-left transition-all duration-200 {hasRole(
								roleItem.key
							)
								? getRoleBadgeColor(roleItem.key) + ' hover:opacity-80'
								: 'border-slate-600 bg-slate-700/50 text-gray-300 hover:border-slate-500 hover:bg-slate-700'}"
						>
							<div class="flex items-center justify-between">
								<div class="flex-1">
									<div class="text-sm font-semibold">{roleItem.label}</div>
									<div class="mt-0.5 text-xs text-gray-400">{roleItem.description}</div>
								</div>
								<div
									class="ml-4 flex h-5 w-5 items-center justify-center rounded border {hasRole(
										roleItem.key
									)
										? 'border-current bg-current'
										: 'border-slate-500'}"
								>
									{#if hasRole(roleItem.key)}
										<svg
											class="h-3 w-3 text-white"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="3"
												d="M5 13l4 4L19 7"
											/>
										</svg>
									{/if}
								</div>
							</div>
						</button>
					</form>
				{/each}
			</div>
		</div>

		<!-- Restrictions -->
		<div>
			<h3 class="mb-3 text-sm font-semibold text-slate-300">Restrictions</h3>
			<div class="space-y-2">
				{#each restrictionRoles as roleItem}
					<form
						method="POST"
						action="?/toggleRole"
						use:enhance={() => {
							return async ({ result }) => {
								if (result.type === 'success') {
									await invalidateAll();
								}
							};
						}}
						class="block"
					>
						<input type="hidden" name="role" value={roleItem.key} />
						<button
							type="submit"
							class="w-full cursor-pointer rounded-lg border px-4 py-3 text-left transition-all duration-200 {hasRole(
								roleItem.key
							)
								? getRoleBadgeColor(roleItem.key) + ' hover:opacity-80'
								: 'border-slate-600 bg-slate-700/50 text-gray-300 hover:border-slate-500 hover:bg-slate-700'}"
						>
							<div class="flex items-center justify-between">
								<div class="flex-1">
									<div class="text-sm font-semibold">{roleItem.label}</div>
									<div class="mt-0.5 text-xs text-gray-400">{roleItem.description}</div>
								</div>
								<div
									class="ml-4 flex h-5 w-5 items-center justify-center rounded border {hasRole(
										roleItem.key
									)
										? 'border-current bg-current'
										: 'border-slate-500'}"
								>
									{#if hasRole(roleItem.key)}
										<svg
											class="h-3 w-3 text-white"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="3"
												d="M5 13l4 4L19 7"
											/>
										</svg>
									{/if}
								</div>
							</div>
						</button>
					</form>
				{/each}
			</div>
		</div>
	</div>
</div>

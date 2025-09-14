<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import IconAccount from '~icons/mdi/account';
	import MembershipBadge from '$lib/components/MembershipBadge.svelte';
	import type { User } from '$lib/db/schema/users';
	import { CERTIFICATIONS, ENDORSEMENTS } from '$lib/config/certifications';

	let { data } = $props();

	const user = $derived.by(
		() =>
			data.user as User & {
				roles: { role: string }[];
				certifications: { certification: string }[];
				endorsements: { endorsement: string }[];
			}
	);

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

	// Use centralized configuration
	const availableCertifications = CERTIFICATIONS.map(cert => cert.key);
	const availableEndorsements = ENDORSEMENTS.map(endorsement => endorsement.key);

	function hasCertification(cert: string): boolean {
		return user.certifications.some((c) => c.certification === cert);
	}

	function getCurrentCertification(): string | null {
		return user.certifications.length > 0 ? user.certifications[0].certification : null;
	}

	function hasEndorsement(endorsement: string): boolean {
		return user.endorsements.some((e) => e.endorsement === endorsement);
	}

	let certificationForm: HTMLFormElement;

	function handleCertificationChange(event: Event) {
		if (certificationForm) {
			certificationForm.requestSubmit();
		}
	}
</script>

<svelte:head>
	<title>{getDisplayName(user)} - User Management - Admin - Indy Center</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div>
		<h1 class="text-2xl font-semibold text-white">{getDisplayName(user)}</h1>
		<p class="text-sm text-gray-400">Manage user certifications and endorsements</p>
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

	<!-- Certifications Management -->
	<div class="rounded-lg border border-slate-700/50 bg-slate-800/50 p-6">
		<div class="mb-4">
			<h2 class="text-lg font-semibold text-white">Certification Level</h2>
			<p class="text-sm text-gray-400">Select the user's current certification level (only one allowed)</p>
		</div>

		<form
			bind:this={certificationForm}
			method="POST"
			action="?/setCertification"
			use:enhance={() => {
				return async ({ result }) => {
					if (result.type === 'success') {
						await invalidateAll();
					}
				};
			}}
		>
			<div class="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
				<!-- None/Clear Option -->
				<label class="cursor-pointer">
					<input
						type="radio"
						name="certification"
						value=""
						checked={getCurrentCertification() === null}
						class="sr-only"
						onchange={handleCertificationChange}
					/>
					<div
						class="w-full rounded-lg border px-4 py-3 text-left text-sm font-medium transition-all duration-200 {getCurrentCertification() === null
							? 'border-red-500 bg-red-600/20 text-red-300'
							: 'border-slate-600 bg-slate-700 text-gray-300 hover:bg-slate-600'}"
					>
						<div class="font-semibold">None</div>
						<div class="text-xs text-gray-400">No certification</div>
					</div>
				</label>

				{#each availableCertifications as cert}
					<label class="cursor-pointer">
						<input
							type="radio"
							name="certification"
							value={cert}
							checked={hasCertification(cert)}
							class="sr-only"
							onchange={handleCertificationChange}
						/>
						<div
							class="w-full rounded-lg border px-4 py-3 text-left text-sm font-medium transition-all duration-200 {hasCertification(
								cert
							)
								? 'border-green-500 bg-green-600/20 text-green-300'
								: 'border-slate-600 bg-slate-700 text-gray-300 hover:bg-slate-600'}"
						>
							<div class="font-semibold">{cert}</div>
							<div class="text-xs text-gray-400">{CERTIFICATIONS.find(c => c.key === cert)?.displayName}</div>
						</div>
					</label>
				{/each}
			</div>
		</form>
	</div>

	<!-- Endorsements Management -->
	<div class="rounded-lg border border-slate-700/50 bg-slate-800/50 p-6">
		<div class="mb-4">
			<h2 class="text-lg font-semibold text-white">Additional Certifications & Endorsements</h2>
			<p class="text-sm text-gray-400">Click to toggle endorsements for this user</p>
		</div>

		<div class="grid grid-cols-1 gap-3 md:grid-cols-3">
			{#each availableEndorsements as endorsement}
				<form
					method="POST"
					action="?/toggleEndorsement"
					use:enhance={() => {
						return async ({ result }) => {
							if (result.type === 'success') {
								await invalidateAll();
							}
						};
					}}
				>
					<input type="hidden" name="endorsement" value={endorsement} />
					<button
						type="submit"
						class="w-full cursor-pointer rounded-lg border px-4 py-3 text-left text-sm font-medium transition-all duration-200 {hasEndorsement(
							endorsement
						)
							? 'border-sky-500 bg-sky-600/20 text-sky-300 hover:bg-sky-600/30'
							: 'border-slate-600 bg-slate-700 text-gray-300 hover:bg-slate-600'}"
					>
						<div class="font-semibold">{endorsement}</div>
						<div class="text-xs text-gray-400">{ENDORSEMENTS.find(e => e.key === endorsement)?.displayName}</div>
					</button>
				</form>
			{/each}
		</div>
	</div>
</div>

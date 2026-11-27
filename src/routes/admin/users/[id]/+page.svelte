<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import {
		Alert,
		Badge,
		Button,
		Chip,
		Credential,
		DescriptionList,
		Heading,
		Icon,
		PageHeader,
		Panel,
		Rating,
		Switch,
		Text,
		type BadgeVariant
	} from '@indy-center/centerline-svelte';
	import { mdiAccount } from '@mdi/js';
	import MembershipBadge from '$lib/components/MembershipBadge.svelte';
	import type { User } from '$lib/db/schema/users';
	import { credentialName, credentialOrder } from '$lib/credentials';
	import { Role } from '$lib/utils/permissions';

	let { data, form } = $props();

	let syncing = $state(false);

	const user = $derived.by(() => data.user as User & { roles: { role: string }[] });

	function getDisplayName(user: User): string {
		return user.preferredName || `${user.firstName} ${user.lastName}`;
	}

	const ROLE_VARIANTS: Record<string, BadgeVariant> = {
		[Role.ADMIN]: 'red',
		[Role.CAN_MANAGE_EVENTS]: 'purple',
		[Role.FEEDBACK_REVIEWER]: 'sky',
		[Role.EVENTS_PROHIBIT_SIGNUP]: 'orange'
	};

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
		{ key: Role.ADMIN, label: 'Administrator', description: 'Full access to the site' },
		{
			key: Role.CAN_MANAGE_EVENTS,
			label: 'Manage events',
			description: 'Can create and edit events'
		},
		{
			key: Role.FEEDBACK_REVIEWER,
			label: 'Feedback reviewer',
			description: 'Can review, follow up on, and publish feedback'
		}
	];

	const restrictionRoles = [
		{
			key: Role.EVENTS_PROHIBIT_SIGNUP,
			label: "Can't sign up for events",
			description: 'Cannot sign up for event positions'
		}
	];
</script>

<svelte:head>
	<title>{getDisplayName(user)} | Users | Admin | Indy Center</title>
</svelte:head>

<PageHeader title={getDisplayName(user)} class="mb-6">
	Manage this user's roles. Certifications and endorsements are edited in the training app.
	{#snippet actions()}
		<Button
			variant="secondary"
			href="https://www.vatusa.net/mgt/controller/{user.cid}"
			target="_blank"
			rel="noopener noreferrer"
		>
			Manage on VATUSA (new tab)
		</Button>
	{/snippet}
</PageHeader>

{#snippet roleSwitches(roles: { key: string; label: string; description: string }[])}
	<div class="flex flex-col gap-3">
		{#each roles as roleItem (roleItem.key)}
			<!-- Each switch saves its role at once -->
			<form
				method="POST"
				action="?/toggleRole"
				use:enhance={() =>
					async ({ result }) => {
						if (result.type === 'success') await invalidateAll();
					}}
			>
				<input type="hidden" name="role" value={roleItem.key} />
				<Switch
					label={roleItem.label}
					checked={hasRole(roleItem.key)}
					onchange={(event) => event.currentTarget.form?.requestSubmit()}
				>
					{roleItem.description}
				</Switch>
			</form>
		{/each}
	</div>
{/snippet}

<div class="flex flex-col gap-6">
	<Panel title="Details" level={2}>
		{#snippet icon()}<Icon path={mdiAccount} />{/snippet}
		<DescriptionList>
			<div>
				<dt>Name</dt>
				<dd>{getDisplayName(user)}</dd>
			</div>
			<div>
				<dt>CID</dt>
				<dd class="font-mono">{user.cid}</dd>
			</div>
			<div>
				<dt>Operating initials</dt>
				<dd>
					{#if user.operatingInitials}
						<Chip variant="initials">{user.operatingInitials}</Chip>
					{:else}
						Not set
					{/if}
				</dd>
			</div>
			<div>
				<dt>Email</dt>
				<dd>{user.email}</dd>
			</div>
			<div>
				<dt>Membership</dt>
				<dd><MembershipBadge size="sm" membership={user.membership} /></dd>
			</div>
			<div>
				<dt>Rating</dt>
				<dd>
					{#if user.data.vatsim.rating.short}
						<Rating rating={user.data.vatsim.rating.short} />
					{:else}
						Unknown
					{/if}
				</dd>
			</div>
			{#if user.roles.length > 0}
				<div>
					<dt>Roles</dt>
					<dd class="flex flex-wrap gap-1">
						{#each user.roles as roleObj (roleObj.role)}
							<Badge size="sm" variant={ROLE_VARIANTS[roleObj.role] ?? 'gray'}>
								<span class="font-mono">{roleObj.role}</span>
							</Badge>
						{/each}
					</dd>
				</div>
			{/if}
		</DescriptionList>
	</Panel>

	<!-- Asks larry to sync this member's Discord roles now -->
	<Panel title="Role sync" level={2}>
		<form
			method="POST"
			action="?/syncRoles"
			use:enhance={() => {
				syncing = true;
				return async ({ update }) => {
					await update({ reset: false });
					syncing = false;
				};
			}}
			class="flex flex-col gap-4"
		>
			<div class="flex flex-wrap items-center justify-between gap-4">
				<Text>Their roles sync on their own. Sync now to update them.</Text>
				<Button type="submit" variant="secondary" busy={syncing} busyLabel="Syncing">
					Sync roles
				</Button>
			</div>
			{#if form?.sync}
				<Alert level={form.sync.level}>{form.sync.message}</Alert>
			{/if}
		</form>
	</Panel>

	<!-- Read-only: the training app owns them -->
	<Panel title="Certification and endorsements" level={2}>
		<div class="mb-4 flex flex-wrap items-start justify-between gap-4">
			<Text size="small">As last stored from the training app.</Text>
			{#if data.held}
				<Button
					variant="secondary"
					href="https://training.flyindycenter.com/certifications/{user.cid}"
				>
					Edit in the training app
				</Button>
			{/if}
		</div>
		{#if data.held}
			<DescriptionList>
				<div>
					<dt>Certification</dt>
					<dd>
						{#if data.held.certification}
							<Credential
								kind="certification"
								code={data.held.certification}
								name={credentialName(data.credentials, data.held.certification)}
							/>
							<span class="ml-2 text-sm text-muted-foreground">
								{credentialName(data.credentials, data.held.certification)}
							</span>
						{:else}
							None
						{/if}
					</dd>
				</div>
				<div>
					<dt>Endorsements</dt>
					<dd>
						{#if endorsements.length > 0}
							<ul class="flex flex-col gap-1">
								{#each endorsements as endorsement (endorsement)}
									<li>
										<Credential
											kind="endorsement"
											code={endorsement}
											name={credentialName(data.credentials, endorsement)}
										/>
										<span class="ml-2 text-sm text-muted-foreground">
											{credentialName(data.credentials, endorsement)}
										</span>
									</li>
								{/each}
							</ul>
						{:else}
							None
						{/if}
					</dd>
				</div>
			</DescriptionList>
		{:else}
			<Text tone="muted">This user isn't on the controller roster.</Text>
		{/if}
	</Panel>

	<Panel title="Roles" level={2}>
		<Heading level={3} look="label" class="mb-3">Permissions</Heading>
		{@render roleSwitches(permissionRoles)}
		<Heading level={3} look="label" class="mt-6 mb-3">Restrictions</Heading>
		{@render roleSwitches(restrictionRoles)}
	</Panel>
</div>

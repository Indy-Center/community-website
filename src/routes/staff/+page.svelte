<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import type { SubmitFunction } from '@sveltejs/kit';
	import {
		Alert,
		Button,
		Card,
		Chip,
		Field,
		Heading,
		Icon,
		Input,
		PageHeader,
		Panel,
		Rating,
		Select,
		Text,
		Textarea
	} from '@indy-center/centerline-svelte';
	import { mdiClose, mdiEmailOutline, mdiPencil, mdiPlus } from '@mdi/js';
	import { defaultStaffEmail } from '$lib/config/staff';

	let { data, form } = $props();

	let editing = $state(false);
	// `${position}-${cid}` of the bio being edited
	let editingBio = $state<string | null>(null);

	function teamMembers(team: { sections: { members: { cid: string; name: string }[] }[] }) {
		const members = team.sections.flatMap((section) => section.members);
		return members.filter((m, i) => members.findIndex((other) => other.cid === m.cid) === i);
	}

	function notIn(members: { cid: string }[]) {
		return (controller: { cid: string }) => !members.some((m) => m.cid === controller.cid);
	}

	const closeBioOnSave: SubmitFunction = () => {
		return async ({ result, update }) => {
			if (result.type === 'success') editingBio = null;
			await update();
		};
	};
</script>

<svelte:head>
	<title>Staff | Indy Center</title>
</svelte:head>

{#snippet memberRow(member: {
	name: string;
	operatingInitials: string | null;
	rating: string | null;
})}
	<span class="font-semibold text-foreground">{member.name}</span>
	{#if member.operatingInitials}
		<Chip variant="initials">{member.operatingInitials}</Chip>
	{/if}
	{#if member.rating}
		<Rating rating={member.rating} />
	{/if}
{/snippet}

{#snippet removeButton(action: string, fields: Record<string, string>, name: string)}
	<form method="POST" {action} use:enhance class="ml-auto">
		{#each Object.entries(fields) as [key, value] (key)}
			<input type="hidden" name={key} {value} />
		{/each}
		<Button type="submit" variant="danger" size="sm" aria-label="Remove {name}">
			<Icon path={mdiClose} />
		</Button>
	</form>
{/snippet}

{#snippet emailForm(key: string, name: string, emails: string[], mailbox: string)}
	{#if editing}
		<form
			method="POST"
			action="?/saveEmails"
			use:enhance
			class="flex items-end gap-2 border-t border-border px-4 py-3"
		>
			<input type="hidden" name="key" value={key} />
			<Field
				label="Emails for {name}"
				hint="Separate with commas. Empty uses {defaultStaffEmail(mailbox, page.url.hostname)}."
				class="min-w-0 flex-1"
			>
				{#snippet children(control)}
					<Input {...control} name="emails" value={emails.join(', ')} />
				{/snippet}
			</Field>
			<Button type="submit" size="sm">Save</Button>
		</form>
	{/if}
{/snippet}

{#snippet emailLinks(emails: string[], mailbox: string)}
	{#if !editing}
		<ul class="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
			{#each emails.length > 0 ? emails : [defaultStaffEmail(mailbox, page.url.hostname)] as email (email)}
				<li class="inline-flex min-w-0 items-center gap-1.5">
					<Icon path={mdiEmailOutline} class="shrink-0 text-muted-foreground" />
					<a
						href="mailto:{email}"
						class="truncate text-link underline hover:no-underline focus-visible:outline-2 focus-visible:outline-ring"
					>
						{email}
					</a>
				</li>
			{/each}
		</ul>
	{/if}
{/snippet}

{#snippet addForm(
	action: string,
	hidden: Record<string, string>,
	id: string,
	label: string,
	options: import('svelte').Snippet
)}
	<form method="POST" {action} use:enhance class="flex items-end gap-2">
		{#each Object.entries(hidden) as [key, value] (key)}
			<input type="hidden" name={key} {value} />
		{/each}
		<Field {label} hideLabel {id} class="min-w-0 flex-1">
			{#snippet children(control)}
				<Select {...control} name="cid" required>
					{@render options()}
				</Select>
			{/snippet}
		</Field>
		<Button type="submit" aria-label={label}>
			<Icon path={mdiPlus} />
		</Button>
	</form>
{/snippet}

<PageHeader title="Facility staff" class="mb-8">
	The people who keep Indy Center running.
	{#snippet actions()}
		{#if data.canEdit}
			<Button
				variant="secondary"
				pressed={editing}
				onclick={() => {
					editing = !editing;
					editingBio = null;
				}}
			>
				<Icon path={mdiPencil} />
				Edit staff
			</Button>
		{/if}
	{/snippet}
</PageHeader>

{#if editing}
	<Alert level="info" class="mb-4">
		Positions follow VATUSA until edited here: team leads (EC, FE and WM) follow VATUSA's point of
		contact for the position, and the rest follow VATUSA facility roles. Editing a position replaces
		its VATUSA holders; reset it to follow VATUSA again. A lead is left off their team list.
	</Alert>
{/if}

{#if form?.message}
	<Alert level="danger" class="mb-4">{form.message}</Alert>
{/if}

<ul class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
	{#each data.staff as position (position.key)}
		{@const team = data.teams.find((t) => t.lead === position.key)}
		<Card as="li" flush>
			<div class="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
				<Heading level={2} look={4}>{position.title}</Heading>
				<Chip variant="senior">{position.key}</Chip>
			</div>
			<div class="flex flex-col gap-4 p-4">
				{#each position.members as member (member.cid)}
					{@const bioKey = `${position.key}-${member.cid}`}
					<div>
						<div class="flex flex-wrap items-center gap-2">
							{@render memberRow(member)}
							{#if editing}
								{@render removeButton(
									'?/remove',
									{ position: position.key, cid: member.cid },
									member.name
								)}
							{/if}
						</div>
						{@render emailLinks(position.emails, position.mailbox)}
						{#if editingBio === bioKey}
							<form
								method="POST"
								action="?/saveBio"
								use:enhance={closeBioOnSave}
								class="mt-2 flex flex-col gap-2"
							>
								<input type="hidden" name="cid" value={member.cid} />
								<Field label="Bio for {member.name}" hint="Up to 1,000 characters.">
									{#snippet children(control)}
										<Textarea
											{...control}
											name="bio"
											rows={4}
											maxlength={1000}
											value={member.bio ?? ''}
										/>
									{/snippet}
								</Field>
								<div class="flex justify-end gap-2">
									<Button variant="secondary" size="sm" onclick={() => (editingBio = null)}>
										Cancel
									</Button>
									<Button type="submit" size="sm">Save bio</Button>
								</div>
							</form>
						{:else}
							{#if member.bio}
								<p class="mt-2 text-sm whitespace-pre-line">{member.bio}</p>
							{/if}
							{#if editing}
								<Button
									variant="secondary"
									size="sm"
									class="mt-2"
									onclick={() => (editingBio = bioKey)}
								>
									{member.bio ? 'Edit bio' : 'Add bio'}
								</Button>
							{/if}
						{/if}
					</div>
				{:else}
					<Text tone="muted">Vacant</Text>
				{/each}
			</div>
			{#if editing}
				{@const available = data.controllers.filter(notIn(position.members))}
				<div class="flex flex-col gap-2 border-t border-border px-4 py-3">
					{#snippet positionOptions()}
						{#if position.isTeamLead && team}
							<option value="">Set lead…</option>
							<optgroup label={team.name}>
								{#each teamMembers(team) as member (member.cid)}
									<option value={member.cid}>{member.name} ({member.cid})</option>
								{/each}
							</optgroup>
							<optgroup label="All controllers">
								{#each available.filter(notIn(teamMembers(team))) as controller (controller.cid)}
									<option value={controller.cid}>{controller.name} ({controller.cid})</option>
								{/each}
							</optgroup>
						{:else}
							<option value="">Add controller…</option>
							{#each available as controller (controller.cid)}
								<option value={controller.cid}>{controller.name} ({controller.cid})</option>
							{/each}
						{/if}
					{/snippet}
					{@render addForm(
						'?/add',
						{ position: position.key },
						`add-${position.key}`,
						`Add to ${position.title}`,
						positionOptions
					)}
					<div class="flex items-center justify-between gap-2">
						<Text as="span" size="small">
							{position.isManual
								? 'Set by hand'
								: position.isTeamLead
									? 'From VATUSA point of contact'
									: 'From VATUSA roles'}
						</Text>
						{#if position.isManual}
							<form method="POST" action="?/reset" use:enhance>
								<input type="hidden" name="position" value={position.key} />
								<Button type="submit" variant="secondary" size="sm">Reset to VATUSA</Button>
							</form>
						{/if}
					</div>
				</div>
			{/if}
			{@render emailForm(position.key, position.title, position.emails, position.mailbox)}
		</Card>
	{/each}
</ul>

<Heading level={2} class="mt-10 mb-4">Teams</Heading>
<div class="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
	{#each data.teams as team (team.key)}
		<Panel title={team.name} level={3} flush>
			<div class="border-b border-border px-4 py-3">
				{#if team.leads.length > 0}
					<Text size="small">Led by {team.leads.map((m) => m.name).join(', ')}</Text>
				{/if}
				{@render emailLinks(team.emails, team.mailbox)}
			</div>
			{#each team.sections as section (section.key)}
				{@const label = section.name ?? team.name}
				<div class="border-b border-border p-4 last:border-b-0">
					{#if section.name}
						<Heading level={4} look="label" class="mb-3">{section.name}</Heading>
					{/if}
					<ul class="flex flex-col gap-3">
						{#each section.members as member (member.cid)}
							<li class="flex flex-wrap items-center gap-2">
								{@render memberRow(member)}
								{#if editing}
									{@render removeButton(
										'?/removeTeamMember',
										{ team: section.key, cid: member.cid },
										member.name
									)}
								{/if}
							</li>
						{:else}
							<li><Text tone="muted">No {section.name?.toLowerCase() ?? 'team members'}</Text></li>
						{/each}
					</ul>
					{#if editing}
						{#snippet teamOptions()}
							<option value="">Add controller…</option>
							{#each data.controllers.filter(notIn( [...section.members, ...team.leads] )) as controller (controller.cid)}
								<option value={controller.cid}>{controller.name} ({controller.cid})</option>
							{/each}
						{/snippet}
						<div class="mt-3">
							{@render addForm(
								'?/addTeamMember',
								{ team: section.key },
								`add-team-${section.key}`,
								`Add to ${label}`,
								teamOptions
							)}
						</div>
					{/if}
				</div>
			{/each}
			{@render emailForm(team.key, team.name, team.emails, team.mailbox)}
		</Panel>
	{/each}
</div>

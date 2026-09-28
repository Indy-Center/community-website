<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import IconPencil from '~icons/mdi/pencil';
	import IconClose from '~icons/mdi/close';
	import IconPlus from '~icons/mdi/plus';
	import IconEmail from '~icons/mdi/email-outline';

	let { data, form } = $props();

	let editing = $state(false);
	// `${position}-${cid}` of the bio being edited
	let editingBio = $state<string | null>(null);

	const selectClass =
		'min-w-0 flex-1 rounded-lg border border-slate-600 bg-slate-700 px-3 py-1.5 text-sm text-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500 focus:outline-none';

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
	<title>Indy Center | Staff</title>
</svelte:head>

{#snippet memberRow(member: {
	name: string;
	operatingInitials: string | null;
	rating: string | null;
})}
	<span class="font-semibold text-white">{member.name}</span>
	{#if member.operatingInitials}
		<span class="rounded bg-indigo-600/80 px-2 py-0.5 font-mono text-xs font-semibold text-white">
			{member.operatingInitials}
		</span>
	{/if}
	{#if member.rating}
		<span class="text-sm text-gray-400">{member.rating}</span>
	{/if}
{/snippet}

{#snippet removeButton(action: string, fields: Record<string, string>, name: string)}
	<form method="POST" {action} use:enhance class="ml-auto">
		{#each Object.entries(fields) as [key, value]}
			<input type="hidden" name={key} {value} />
		{/each}
		<button
			type="submit"
			title="Remove {name}"
			class="rounded p-1 text-gray-400 transition-colors hover:bg-red-600/20 hover:text-red-400"
		>
			<IconClose class="h-4 w-4" />
		</button>
	</form>
{/snippet}

{#snippet emailForm(key: string, name: string, emails: string[])}
	{#if editing}
		<form
			method="POST"
			action="?/saveEmails"
			use:enhance
			class="flex gap-2 border-t border-slate-700/60 px-4 py-3"
		>
			<input type="hidden" name="key" value={key} />
			<label for="emails-{key}" class="sr-only">Emails for {name}</label>
			<input
				id="emails-{key}"
				type="text"
				name="emails"
				value={emails.join(', ')}
				placeholder="Emails, separated by commas"
				class="min-w-0 flex-1 rounded-lg border border-slate-600 bg-slate-700 px-3 py-1.5 text-sm text-white placeholder-gray-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500 focus:outline-none"
			/>
			<button
				type="submit"
				class="rounded-lg bg-sky-600 px-3 text-sm font-medium text-white transition-colors hover:bg-sky-700"
			>
				Save
			</button>
		</form>
	{/if}
{/snippet}

{#snippet emailLinks(emails: string[])}
	{#if !editing && emails.length > 0}
		<div class="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
			{#each emails as email (email)}
				<a
					href="mailto:{email}"
					class="inline-flex min-w-0 items-center gap-1.5 text-sky-400 transition-colors hover:text-sky-300"
				>
					<IconEmail class="h-4 w-4 shrink-0" />
					<span class="truncate">{email}</span>
				</a>
			{/each}
		</div>
	{/if}
{/snippet}

{#snippet addButton(title: string)}
	<button
		type="submit"
		{title}
		class="rounded-lg bg-sky-600 px-3 text-white transition-colors hover:bg-sky-700"
	>
		<IconPlus class="h-4 w-4" />
	</button>
{/snippet}

<div class="mb-8 flex items-start justify-between gap-3">
	<div>
		<h1 class="text-3xl font-bold text-white">Facility Staff</h1>
		<p class="mt-2 text-gray-400">The people who keep Indy Center running.</p>
	</div>
	{#if data.canEdit}
		<button
			type="button"
			onclick={() => {
				editing = !editing;
				editingBio = null;
			}}
			class="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-all focus:ring-2 focus:ring-sky-500 focus:outline-none {editing
				? 'bg-sky-600 hover:bg-sky-700'
				: 'border border-slate-600 bg-slate-700 hover:bg-slate-600'}"
		>
			<IconPencil class="h-4 w-4" />
			{editing ? 'Done' : 'Edit Staff'}
		</button>
	{/if}
</div>

{#if editing}
	<p class="mb-4 text-sm text-gray-400">
		Positions follow VATUSA facility roles until edited here. Editing a position replaces its VATUSA
		holders; reset it to follow VATUSA again. Team leads (EC, FE and WM) are always set here, and a
		lead is left off their team list.
	</p>
{/if}

{#if form?.message}
	<div
		class="mb-4 rounded-lg border border-red-500/40 bg-red-600/10 px-4 py-3 text-sm text-red-300"
	>
		{form.message}
	</div>
{/if}

<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
	{#each data.staff as position (position.key)}
		{@const team = data.teams.find((t) => t.lead === position.key)}
		<div class="rounded-lg border border-slate-700/60 bg-slate-800/60 shadow-sm backdrop-blur-sm">
			<div class="flex items-center justify-between border-b border-slate-700/60 px-4 py-3">
				<h2 class="text-sm font-semibold tracking-wide text-white uppercase">{position.title}</h2>
				<span class="rounded bg-sky-600/80 px-2 py-0.5 font-mono text-xs font-semibold text-white">
					{position.key}
				</span>
			</div>
			<div class="space-y-4 px-4 py-4">
				{#each position.members as member (member.cid)}
					{@const bioKey = `${position.key}-${member.cid}`}
					<div>
						<div class="flex items-center gap-2">
							{@render memberRow(member)}
							{#if editing}
								{@render removeButton(
									'?/remove',
									{ position: position.key, cid: member.cid },
									member.name
								)}
							{/if}
						</div>
						{@render emailLinks(position.emails)}
						{#if editingBio === bioKey}
							<form method="POST" action="?/saveBio" use:enhance={closeBioOnSave} class="mt-2">
								<input type="hidden" name="cid" value={member.cid} />
								<label for="bio-{bioKey}" class="sr-only">Bio for {member.name}</label>
								<textarea
									id="bio-{bioKey}"
									name="bio"
									rows="4"
									maxlength="1000"
									class="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white placeholder-gray-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500 focus:outline-none"
									placeholder="A few words about {member.name}…">{member.bio ?? ''}</textarea
								>
								<div class="mt-2 flex justify-end gap-2 text-sm">
									<button
										type="button"
										onclick={() => (editingBio = null)}
										class="rounded-lg px-3 py-1.5 text-gray-300 hover:bg-slate-700"
									>
										Cancel
									</button>
									<button
										type="submit"
										class="rounded-lg bg-sky-600 px-3 py-1.5 font-medium text-white hover:bg-sky-700"
									>
										Save bio
									</button>
								</div>
							</form>
						{:else}
							{#if member.bio}
								<p class="mt-2 text-sm leading-relaxed whitespace-pre-line text-gray-300">
									{member.bio}
								</p>
							{/if}
							{#if editing}
								<button
									type="button"
									onclick={() => (editingBio = bioKey)}
									class="mt-1 text-xs font-medium text-sky-400 hover:text-sky-300"
								>
									{member.bio ? 'Edit bio' : 'Add bio'}
								</button>
							{/if}
						{/if}
					</div>
				{:else}
					<p class="text-sm text-gray-500 italic">Vacant</p>
				{/each}
			</div>
			{#if editing}
				{@const available = data.controllers.filter(notIn(position.members))}
				<div class="space-y-2 border-t border-slate-700/60 px-4 py-3">
					<form method="POST" action="?/add" use:enhance class="flex gap-2">
						<input type="hidden" name="position" value={position.key} />
						<label for="add-{position.key}" class="sr-only">Add to {position.title}</label>
						<select id="add-{position.key}" name="cid" required class={selectClass}>
							{#if position.manualOnly && team}
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
						</select>
						{@render addButton(`Add to ${position.title}`)}
					</form>
					{#if !position.manualOnly}
						<div class="flex items-center justify-between text-xs">
							<span class="text-gray-500">
								{position.isManual ? 'Manually set' : 'From VATUSA roles'}
							</span>
							{#if position.isManual}
								<form method="POST" action="?/reset" use:enhance>
									<input type="hidden" name="position" value={position.key} />
									<button type="submit" class="font-medium text-sky-400 hover:text-sky-300">
										Reset to VATUSA
									</button>
								</form>
							{/if}
						</div>
					{/if}
				</div>
			{/if}
			{@render emailForm(position.key, position.title, position.emails)}
		</div>
	{/each}
</div>

<h2 class="mt-10 mb-4 text-2xl font-bold text-white">Teams</h2>
<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
	{#each data.teams as team (team.key)}
		<div class="rounded-lg border border-slate-700/60 bg-slate-800/60 shadow-sm backdrop-blur-sm">
			<div class="border-b border-slate-700/60 px-4 py-3">
				<h3 class="text-sm font-semibold tracking-wide text-white uppercase">{team.name}</h3>
				{#if team.leads.length > 0}
					<p class="mt-1 text-xs text-gray-400">
						Led by {team.leads.map((m) => m.name).join(', ')}
					</p>
				{/if}
				{@render emailLinks(team.emails)}
			</div>
			{#each team.sections as section (section.key)}
				{@const label = section.name ?? team.name}
				<div class="border-b border-slate-700/60 px-4 py-4 last:border-b-0">
					{#if section.name}
						<h4 class="mb-3 text-xs font-semibold tracking-wide text-gray-400 uppercase">
							{section.name}
						</h4>
					{/if}
					<div class="space-y-3">
						{#each section.members as member (member.cid)}
							<div class="flex items-center gap-2">
								{@render memberRow(member)}
								{#if editing}
									{@render removeButton(
										'?/removeTeamMember',
										{ team: section.key, cid: member.cid },
										member.name
									)}
								{/if}
							</div>
						{:else}
							<p class="text-sm text-gray-500 italic">
								No {section.name?.toLowerCase() ?? 'team members'}
							</p>
						{/each}
					</div>
					{#if editing}
						<form method="POST" action="?/addTeamMember" use:enhance class="mt-3 flex gap-2">
							<input type="hidden" name="team" value={section.key} />
							<label for="add-team-{section.key}" class="sr-only">Add to {label}</label>
							<select id="add-team-{section.key}" name="cid" required class={selectClass}>
								<option value="">Add controller…</option>
								{#each data.controllers.filter(notIn( [...section.members, ...team.leads] )) as controller (controller.cid)}
									<option value={controller.cid}>{controller.name} ({controller.cid})</option>
								{/each}
							</select>
							{@render addButton(`Add to ${label}`)}
						</form>
					{/if}
				</div>
			{/each}
			{@render emailForm(team.key, team.name, team.emails)}
		</div>
	{/each}
</div>

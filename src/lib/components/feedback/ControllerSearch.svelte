<script lang="ts">
	import IconChevronDown from '~icons/mdi/chevron-down';
	import IconMagnify from '~icons/mdi/magnify';

	type SearchUser = {
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
		value = $bindable(''),
		invalid = false
	}: {
		name: string;
		users: SearchUser[];
		value?: string;
		invalid?: boolean;
	} = $props();

	const displayName = (user: SearchUser) =>
		user.preferredName || `${user.firstName} ${user.lastName}`;

	const selectedUser = $derived(users.find((u) => u.id === value) ?? null);

	let open = $state(false);
	let query = $state('');
	let highlighted = $state(0);
	let input: HTMLInputElement | null = $state(null);
	let listEl: HTMLUListElement | null = $state(null);
	const uid = $props.id();
	const listId = `controller-search-${uid}`;

	// Matches display name, legal name, operating initials, or CID
	const results = $derived.by(() => {
		const q = query.trim().toLowerCase();
		if (!q) return users;
		const matches = users.filter((u) =>
			[displayName(u), `${u.firstName} ${u.lastName}`, u.operatingInitials ?? '', u.cid].some(
				(field) => field.toLowerCase().includes(q)
			)
		);

		// Exact operating initials or CID match goes to the top
		const isExact = (u: SearchUser) => u.operatingInitials?.toLowerCase() === q || u.cid === q;
		return [...matches.filter(isExact), ...matches.filter((u) => !isExact(u))];
	});

	function openList() {
		query = '';
		highlighted = 0;
		open = true;
	}

	function close() {
		open = false;
		query = '';
	}

	function choose(user: SearchUser) {
		value = user.id;
		close();
		input?.blur();
	}

	function scrollHighlightedIntoView() {
		listEl?.children[highlighted]?.scrollIntoView({ block: 'nearest' });
	}

	function handleKeydown(e: KeyboardEvent) {
		if (!open) {
			if (e.key === 'ArrowDown' || e.key === 'Enter') {
				e.preventDefault();
				openList();
			}
			return;
		}
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			highlighted = Math.min(highlighted + 1, results.length - 1);
			scrollHighlightedIntoView();
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			highlighted = Math.max(highlighted - 1, 0);
			scrollHighlightedIntoView();
		} else if (e.key === 'Enter') {
			// Keep Enter from submitting the form while the list is open
			e.preventDefault();
			if (results.length > 0) choose(results[highlighted]);
		} else if (e.key === 'Escape') {
			e.preventDefault();
			close();
			input?.blur();
		}
	}

	function handleInput() {
		highlighted = 0;
		open = true;
	}
</script>

<div class="relative">
	<input type="hidden" {name} {value} />
	<IconMagnify
		class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400"
	/>
	<input
		bind:this={input}
		id={name}
		type="text"
		role="combobox"
		aria-controls={listId}
		aria-expanded={open}
		aria-autocomplete="list"
		aria-invalid={invalid ? 'true' : undefined}
		autocomplete="off"
		bind:value={query}
		placeholder={selectedUser
			? `${displayName(selectedUser)} (${selectedUser.cid})`
			: 'Start typing a name, initials, or CID'}
		onfocus={openList}
		onblur={close}
		oninput={handleInput}
		onkeydown={handleKeydown}
		class="w-full rounded-lg border border-slate-600 bg-slate-700 py-2 pr-9 pl-9 text-white transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-500 focus:outline-none {selectedUser
			? 'placeholder:text-white'
			: 'placeholder:text-gray-400'} focus:placeholder:text-gray-400"
	/>
	<IconChevronDown
		class="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-gray-400 transition-transform {open
			? 'rotate-180'
			: ''}"
	/>

	{#if open}
		<ul
			bind:this={listEl}
			id={listId}
			role="listbox"
			class="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-600 bg-slate-800 py-1 shadow-xl"
		>
			{#each results as user, i (user.id)}
				<li
					role="option"
					aria-selected={i === highlighted}
					onmousedown={(e) => {
						// Prevent the input blur from closing the list before the click lands
						e.preventDefault();
						choose(user);
					}}
					onmouseenter={() => (highlighted = i)}
					class="flex cursor-pointer items-center justify-between gap-2 px-4 py-2 text-sm {i ===
					highlighted
						? 'bg-sky-500/20 text-white'
						: 'text-slate-200'}"
				>
					<span class="truncate">
						{displayName(user)}
						{#if user.id === value}<span class="text-sky-400"> ✓</span>{/if}
					</span>
					<span class="flex-shrink-0 font-mono text-xs text-slate-400">{user.cid}</span>
				</li>
			{:else}
				<li class="px-4 py-2 text-sm text-slate-400">No controllers match "{query}"</li>
			{/each}
		</ul>
	{/if}
</div>

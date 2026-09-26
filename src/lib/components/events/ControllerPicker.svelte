<script lang="ts">
	import IconChevronDown from '~icons/mdi/chevron-down';
	import IconMagnify from '~icons/mdi/magnify';

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
		onselect: (form: HTMLFormElement | null) => void;
	} = $props();

	const displayName = (user: PickerUser) =>
		user.preferredName || `${user.firstName} ${user.lastName}`;

	const sortedUsers = $derived(
		[...users].sort((a, b) =>
			displayName(a).localeCompare(displayName(b), undefined, { sensitivity: 'base' })
		)
	);

	const selectedUser = $derived(users.find((u) => u.id === value) ?? null);

	let open = $state(false);
	let query = $state('');
	let highlighted = $state(0);
	let input: HTMLInputElement | null = $state(null);
	let hiddenInput: HTMLInputElement | null = $state(null);
	let listEl: HTMLUListElement | null = $state(null);
	let popupStyle = $state('');
	const uid = $props.id();
	const listId = `controller-picker-${uid}`;

	// Matches display name, legal name, operating initials, or CID
	const results = $derived.by(() => {
		const q = query.trim().toLowerCase();
		const matches = q
			? sortedUsers.filter((u) =>
					[displayName(u), `${u.firstName} ${u.lastName}`, u.operatingInitials ?? '', u.cid].some(
						(field) => field.toLowerCase().includes(q)
					)
				)
			: sortedUsers;

		// Exact operating initials match goes to the top
		const exact = matches.filter((u) => u.operatingInitials?.toLowerCase() === q);
		const rest = matches.filter((u) => u.operatingInitials?.toLowerCase() !== q);
		return [...exact, ...rest];
	});

	// Option 0 is "Unassigned" when not searching
	const options = $derived<(PickerUser | null)[]>(query.trim() ? results : [null, ...results]);

	function positionPopup() {
		if (!input) return;
		const rect = input.getBoundingClientRect();
		const spaceBelow = window.innerHeight - rect.bottom;
		const placeAbove = spaceBelow < 280 && rect.top > spaceBelow;
		popupStyle = placeAbove
			? `left:${rect.left}px;bottom:${window.innerHeight - rect.top + 4}px;width:${rect.width}px`
			: `left:${rect.left}px;top:${rect.bottom + 4}px;width:${rect.width}px`;
	}

	function openPicker() {
		query = '';
		highlighted = 0;
		open = true;
		positionPopup();
	}

	function close() {
		open = false;
		query = '';
	}

	function choose(user: PickerUser | null) {
		const id = user?.id ?? '';
		close();
		input?.blur();
		if (id === (value ?? '') || !hiddenInput) return;
		hiddenInput.value = id;
		onselect(hiddenInput.form);
	}

	// Render the list on <body> so table overflow and the Panel's backdrop-blur
	// (which re-anchors position: fixed) don't clip or offset it
	function portal(node: HTMLElement) {
		document.body.appendChild(node);
		return { destroy: () => node.remove() };
	}

	function scrollHighlightedIntoView() {
		listEl?.children[highlighted]?.scrollIntoView({ block: 'nearest' });
	}

	function handleKeydown(e: KeyboardEvent) {
		if (!open) {
			if (e.key === 'ArrowDown' || e.key === 'Enter') {
				e.preventDefault();
				openPicker();
			}
			return;
		}
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			highlighted = Math.min(highlighted + 1, options.length - 1);
			scrollHighlightedIntoView();
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			highlighted = Math.max(highlighted - 1, 0);
			scrollHighlightedIntoView();
		} else if (e.key === 'Enter') {
			e.preventDefault();
			if (options.length > 0) choose(options[highlighted]);
		} else if (e.key === 'Escape') {
			e.preventDefault();
			close();
			input?.blur();
		}
	}

	function handleInput() {
		highlighted = 0;
		if (!open) {
			open = true;
			positionPopup();
		}
	}
</script>

<svelte:window
	onresize={() => open && positionPopup()}
	onscrollcapture={() => open && positionPopup()}
/>

<div class="relative">
	<input bind:this={hiddenInput} type="hidden" {name} value={value ?? ''} />
	<IconMagnify
		class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
	/>
	<input
		bind:this={input}
		type="text"
		role="combobox"
		aria-controls={listId}
		aria-expanded={open}
		aria-autocomplete="list"
		autocomplete="off"
		bind:value={query}
		placeholder={selectedUser
			? `${displayName(selectedUser)} (${selectedUser.operatingInitials ?? '--'})`
			: 'Unassigned'}
		onfocus={openPicker}
		onblur={close}
		oninput={handleInput}
		onkeydown={handleKeydown}
		class="w-full rounded-lg border-0 bg-slate-700 py-2 pr-8 pl-9 text-sm text-white focus:ring-2 focus:ring-sky-500 {selectedUser
			? 'placeholder:text-white'
			: 'placeholder:text-slate-400'} focus:placeholder:text-slate-400"
	/>
	<IconChevronDown
		class="pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 text-slate-400 transition-transform {open
			? 'rotate-180'
			: ''}"
	/>

	{#if open}
		<ul
			bind:this={listEl}
			use:portal
			id={listId}
			role="listbox"
			style={popupStyle}
			class="fixed z-50 max-h-64 min-w-56 overflow-y-auto rounded-lg border border-slate-600 bg-slate-800 py-1 shadow-xl"
		>
			{#each options as option, i (option?.id ?? '__unassigned')}
				<li
					role="option"
					aria-selected={i === highlighted}
					onmousedown={(e) => {
						// Prevent the input blur from closing the list before the click lands
						e.preventDefault();
						choose(option);
					}}
					onmouseenter={() => (highlighted = i)}
					class="flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm {i ===
					highlighted
						? 'bg-sky-500/20 text-white'
						: 'text-slate-200'}"
				>
					{#if option}
						<span class="truncate">
							{displayName(option)}
							{#if option.id === value}<span class="text-sky-400"> ✓</span>{/if}
						</span>
						<span class="flex-shrink-0 font-mono text-xs text-slate-400">
							{option.operatingInitials ?? '--'}
						</span>
					{:else}
						<span class="text-slate-400 italic">
							Unassigned
							{#if !value}<span class="text-sky-400 not-italic"> ✓</span>{/if}
						</span>
					{/if}
				</li>
			{:else}
				<li class="px-3 py-2 text-sm text-slate-400">No controllers match "{query}"</li>
			{/each}
		</ul>
	{/if}
</div>

<script lang="ts">
	// PROTOTYPE (prototype/chrome): an app's own navigation, wide screens.
	// A: links and one level of dropdown groups. B: every page flat.
	// C: groups become section links; their pages show as tabs (SectionTabs).
	import IconChevronDown from '~icons/mdi/chevron-down';
	import Popover from './Popover.svelte';
	import { isGroup, isCurrent, navLinks, type NavItem } from './chrome';
	import { icons } from './icons';
	import { control, current, row, currentRow } from './cls';

	let {
		items,
		mode,
		pathname,
		home
	}: { items: NavItem[]; mode: string; pathname: string; home: string } = $props();

	const here = (href: string) => isCurrent(pathname, href, home);
	const shown = $derived(mode === 'B' ? navLinks(items) : items);
</script>

<nav aria-label="Main">
	<ul class="flex items-center gap-1">
		{#each shown as item (item.label)}
			{@const Icon = icons[item.icon]}
			<li>
				{#if !isGroup(item)}
					<a
						href={item.href}
						class="{control} {here(item.href) ? current : ''}"
						aria-current={here(item.href) ? 'page' : undefined}
					>
						<Icon class="h-4 w-4" aria-hidden="true" />{item.label}
					</a>
				{:else if mode === 'C'}
					{@const active = item.children.some((c) => here(c.href))}
					<a
						href={item.children[0].href}
						class="{control} {active ? current : ''}"
						aria-current={active ? 'true' : undefined}
					>
						<Icon class="h-4 w-4" aria-hidden="true" />{item.label}
					</a>
				{:else}
					{@const active = item.children.some((c) => here(c.href))}
					<Popover buttonClass="{control} {active ? current : ''}" panelClass="w-56 p-2">
						{#snippet trigger(open)}
							<Icon class="h-4 w-4" aria-hidden="true" />{item.label}
							<IconChevronDown
								class="h-4 w-4 transition-transform {open ? 'rotate-180' : ''}"
								aria-hidden="true"
							/>
						{/snippet}
						<ul class="space-y-1">
							{#each item.children as child (child.href)}
								{@const ChildIcon = icons[child.icon]}
								<li>
									<a
										href={child.href}
										class="{row} {here(child.href) ? currentRow : ''}"
										aria-current={here(child.href) ? 'page' : undefined}
									>
										<ChildIcon class="h-4 w-4" aria-hidden="true" />{child.label}
									</a>
								</li>
							{/each}
						</ul>
					</Popover>
				{/if}
			</li>
		{/each}
	</ul>
</nav>

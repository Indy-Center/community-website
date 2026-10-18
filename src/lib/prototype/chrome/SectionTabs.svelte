<script lang="ts">
	// PROTOTYPE (prototype/chrome): nav C's second level: the current section's
	// pages as a row of tabs under the header. Scrolls sideways on phones.
	import { isGroup, isCurrent, type NavItem } from './chrome';
	import { control, current } from './cls';

	let { items, pathname, home }: { items: NavItem[]; pathname: string; home: string } = $props();

	const section = $derived(
		items.filter(isGroup).find((g) => g.children.some((c) => isCurrent(pathname, c.href, home)))
	);
</script>

{#if section}
	<nav aria-label={section.label} class="border-t border-slate-700/60">
		<ul class="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-2 py-1">
			<li class="flex shrink-0 items-center px-2 text-xs font-semibold text-gray-400 uppercase">
				{section.label}
			</li>
			{#each section.children as child (child.href)}
				{@const on = isCurrent(pathname, child.href, home)}
				<li class="shrink-0">
					<a
						href={child.href}
						class="{control} {on ? current : ''}"
						aria-current={on ? 'page' : undefined}>{child.label}</a
					>
				</li>
			{/each}
		</ul>
	</nav>
{/if}

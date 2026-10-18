<script lang="ts">
	// PROTOTYPE (prototype/chrome): an app's own navigation, wide screens (nav A,
	// decided): links and one level of dropdown groups. How the current page is
	// marked comes from the header's `data-current` (see ChromeHeader).
	import IconChevronDown from '~icons/mdi/chevron-down';
	import Popover from './Popover.svelte';
	import { isGroup, isCurrent, type NavItem } from './chrome';
	import { icons } from './icons';
	import { control, row } from './cls';

	let { items, pathname, home }: { items: NavItem[]; pathname: string; home: string } = $props();

	const here = (href: string) => isCurrent(pathname, href, home);
</script>

<nav aria-label="Main" class="chrome-top">
	<ul class="flex items-center gap-1">
		{#each items as item (item.label)}
			{@const Icon = icons[item.icon]}
			<li>
				{#if !isGroup(item)}
					<a href={item.href} class={control} aria-current={here(item.href) ? 'page' : undefined}>
						<Icon class="h-4 w-4" aria-hidden="true" />{item.label}
					</a>
				{:else}
					<Popover
						buttonClass={control}
						active={item.children.some((c) => here(c.href))}
						panelClass="w-56 p-2"
					>
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
										class={row}
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

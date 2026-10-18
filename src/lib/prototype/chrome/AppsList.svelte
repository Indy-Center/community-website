<script lang="ts">
	// PROTOTYPE (prototype/chrome): every app, the current one marked.
	import IconCheck from '~icons/mdi/check';
	import { apps, type AppKey } from './chrome';
	import { icons } from './icons';
	import { row, currentRow } from './cls';

	let { app }: { app: AppKey } = $props();
</script>

<ul class="space-y-1 p-2">
	{#each apps as entry (entry.key)}
		{@const Icon = icons[entry.key]}
		{@const here = entry.key === app}
		<li>
			<a
				href={entry.home}
				aria-current={here ? 'true' : undefined}
				class="{row} py-2 {here ? currentRow : ''}"
			>
				<Icon class="h-5 w-5 shrink-0" aria-hidden="true" />
				<span class="flex-1">
					<span class="block font-medium text-white">{entry.name}</span>
					<span class="block text-xs text-gray-400">{entry.what}</span>
				</span>
				{#if here}
					<span class="flex items-center gap-1 text-xs text-sky-300">
						<IconCheck class="h-4 w-4" aria-hidden="true" />You’re here
					</span>
				{:else if entry.live}
					<span class="text-xs text-gray-400">Live site</span>
				{/if}
			</a>
		</li>
	{/each}
</ul>

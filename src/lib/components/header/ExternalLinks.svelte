<script lang="ts">
	import IconBook from '~icons/mdi/book-open-variant';
	import IconTools from '~icons/mdi/tools';

	let { mobile = false }: { mobile?: boolean } = $props();

	const EXTERNAL_LINKS = [
		{
			label: 'Tools',
			href: 'https://tools.flyindycenter.com',
			icon: IconTools
		},
		{
			label: 'Library',
			href: 'https://wiki.flyindycenter.com',
			icon: IconBook
		}
	];
</script>

{#if mobile}
	<div class="mb-2 px-4 text-xs font-medium tracking-wider text-gray-500 uppercase">
		Quick Links
	</div>
	{#each EXTERNAL_LINKS as link}
		{@const Icon = link.icon}
		<a
			href={link.href}
			target="_blank"
			rel="noopener noreferrer"
			class="flex cursor-pointer items-center space-x-3 rounded-lg px-4 py-2 text-sm font-medium text-gray-400 transition-colors duration-200 hover:bg-slate-700/30 hover:text-white"
		>
			<Icon class="h-4 w-4" />
			<span>{link.label}</span>
		</a>
	{/each}
{:else}
	<div class="flex items-center space-x-1 border-l border-slate-600/30 pl-4">
		{#each EXTERNAL_LINKS as link}
			{@const Icon = link.icon}
			<a
				href={link.href}
				target="_blank"
				rel="noopener noreferrer"
				class="flex cursor-pointer items-center space-x-1 rounded-md px-2 py-1 text-xs font-medium text-gray-400 transition-colors duration-200 hover:bg-slate-700/50 hover:text-white"
				title={link.label}
			>
				<Icon class="h-4 w-4" aria-hidden="true" />
				<span class="hidden lg:inline">{link.label}</span>
			</a>
		{/each}
	</div>
{/if}
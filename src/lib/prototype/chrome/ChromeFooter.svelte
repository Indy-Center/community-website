<script lang="ts">
	// PROTOTYPE (prototype/chrome): the footer. A: the disclaimer (today).
	// B: a row of policy links above it. C: a small map of what people most
	// often look for. Policies not written yet are shown, but not as links.
	import { apps, type AppKey } from './chrome';
	import { focus } from './cls';

	let { variant, app }: { variant: string; app: AppKey } = $props();

	type Item = { label: string; href?: string };
	const policies: Item[] = [
		{ label: 'Privacy policy' },
		{ label: 'Accessibility statement' },
		{ label: 'Community policy' }
	];
	const help: Item[] = [
		{ label: 'Contact us', href: '/contact' },
		{ label: 'Staff', href: '/staff' },
		{ label: 'Discord', href: 'https://discord.indy.center' }
	];
	const year = new Date().getFullYear();
	const link = `inline-flex min-h-[var(--tap)] items-center text-sm text-gray-300 underline-offset-4 hover:text-white hover:underline ${focus}`;
	const notYet = 'inline-flex min-h-[var(--tap)] items-center gap-1 text-sm text-gray-400';
</script>

{#snippet item(i: Item)}
	{#if i.href}
		<a href={i.href} class={link}>{i.label}</a>
	{:else}
		<span class={notYet}>{i.label} <span class="text-xs">(not written yet)</span></span>
	{/if}
{/snippet}

<footer data-chrome="footer" class="shrink-0 border-t border-slate-800 bg-gray-900">
	<div class="mx-auto max-w-6xl px-4 py-4">
		{#if variant === 'B'}
			<nav aria-label="Policies and help" class="mb-3">
				<ul class="flex flex-wrap justify-center gap-x-6">
					{#each [...policies, help[0]] as i (i.label)}<li>{@render item(i)}</li>{/each}
				</ul>
			</nav>
		{:else if variant === 'C'}
			<nav aria-label="Indy Center" class="mb-6 grid grid-cols-2 gap-6 pt-4 sm:grid-cols-3">
				<div>
					<h2 class="mb-1 text-xs font-semibold tracking-wider text-gray-400 uppercase">Apps</h2>
					<ul>
						{#each apps as a (a.key)}
							<li>
								<a href={a.home} class={link} aria-current={a.key === app ? 'true' : undefined}
									>{a.name}</a
								>
							</li>
						{/each}
					</ul>
				</div>
				<div>
					<h2 class="mb-1 text-xs font-semibold tracking-wider text-gray-400 uppercase">Help</h2>
					<ul>
						{#each help as i (i.label)}<li>{@render item(i)}</li>{/each}
					</ul>
				</div>
				<div>
					<h2 class="mb-1 text-xs font-semibold tracking-wider text-gray-400 uppercase">
						Policies
					</h2>
					<ul>
						{#each policies as i (i.label)}<li>{@render item(i)}</li>{/each}
					</ul>
				</div>
			</nav>
		{/if}
		<div class="text-center">
			<p class="mb-1 text-xs leading-tight text-gray-400">
				This site is not affiliated with the Federal Aviation Administration or any governing
				aviation body. All content contained herein is approved only for use on the VATSIM network.
			</p>
			<p class="text-xs leading-tight text-gray-500">Copyright {year} Indy Center</p>
		</div>
	</div>
</footer>

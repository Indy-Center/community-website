<script lang="ts">
	// PROTOTYPE (prototype/chrome): how to use the chrome prototype, and every
	// option on one page.
	import { page } from '$app/state';
	import { apps, parseVariant, points, variantCode } from '$lib/prototype/chrome/chrome';

	const variant = $derived(parseVariant(page.url.searchParams.get('variant')));
	const withOption = (key: string, letter: string) =>
		`?variant=${variantCode({ ...variant, [key]: letter })}`;
</script>

<svelte:head>
	<title>Chrome prototype | Indy Center</title>
</svelte:head>

<div class="mb-8">
	<h1 class="text-3xl font-bold text-white">Chrome prototype</h1>
	<p class="mt-2 max-w-3xl text-gray-400">
		The chrome every Indy Center app shares, tried on the site’s real pages. The bar at the bottom
		switches each point’s option; your choice holds while you browse and move between apps. Training
		and the Library are stand-ins with their real navigation, so going there and back can be tried.
	</p>
</div>

<section class="mb-8 max-w-3xl text-gray-300">
	<h2 class="mb-2 text-xl font-semibold text-white">Things to try</h2>
	<ul class="list-disc space-y-1 pl-6">
		<li>
			From Events, go to Training, open a page in Teach, then get back to the hub and to Training’s
			home.
		</li>
		<li>
			Find where you are: the current app in the menu of apps, the current page in the navigation.
		</li>
		<li>Open the user menu in each app: what stays the same, what the app adds.</li>
		<li>Do it all at phone width, by touch, and with the keyboard alone (Tab, Enter, Escape).</li>
		<li>
			Switch Dark and Light: the header and footer stay dark in both (the settled “framed” light).
		</li>
	</ul>
	<p class="mt-3 text-sm text-gray-400">
		The address holds the choice as <code class="text-gray-300">?variant=</code> with one letter per
		point, in the order below: <code class="text-gray-300">{variantCode(variant)}</code> now. Also
		<code class="text-gray-300">&scheme=dark|light</code> and
		<code class="text-gray-300">&signed=1|0</code>.
	</p>
</section>

<div class="grid gap-6 md:grid-cols-2">
	{#each points as point, i (point.key)}
		<section class="rounded-lg border border-slate-700/60 bg-slate-800/60 p-4">
			<h2 class="text-lg font-semibold text-white">{i + 1}. {point.name}</h2>
			<p class="mt-1 text-sm text-gray-400">{point.question}</p>
			<ul class="mt-3 space-y-3">
				{#each point.options as option (option.key)}
					<li class="text-sm text-gray-300">
						<a
							class="font-medium text-sky-400 underline underline-offset-4"
							href={withOption(point.key, option.key)}>{option.key} · {option.name}</a
						>{#if variant[point.key] === option.key}<span class="ml-2 text-xs text-gray-400"
								>(showing)</span
							>{/if}
						<p class="mt-0.5 text-gray-400">{option.note}</p>
					</li>
				{/each}
			</ul>
		</section>
	{/each}
</div>

<section class="mt-8 max-w-3xl text-sm text-gray-400">
	<h2 class="mb-2 text-xl font-semibold text-white">Fixed in every option</h2>
	<ul class="list-disc space-y-1 pl-6">
		<li>
			Page titles put the page first: <code>Events | Indy Center</code> on the hub,
			<code>Sessions | Training | Indy Center</code> elsewhere (the spec). The bar shows the current
			one.
		</li>
		<li>
			Links between apps open in the same tab. The apps are {apps.map((a) => a.name).join(', ')};
			Charts and Controller Tools go to the live sites.
		</li>
		<li>The settled palette: dark A with the AA fixes, light L4 framed.</li>
		<li>The navigation moves into the phone menu below 1024px wide.</li>
		<li>Signed in shows a sample member unless you are really signed in.</li>
	</ul>
</section>

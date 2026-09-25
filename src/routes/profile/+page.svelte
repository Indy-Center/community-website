<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { format } from 'date-fns';
	import MembershipBadge from '$lib/components/MembershipBadge.svelte';
	import { MAX_BIO_LENGTH } from '$lib/forms/profile';
	import IconStar from '~icons/mdi/star';
	import IconStarOutline from '~icons/mdi/star-outline';
	import IconMessage from '~icons/mdi/message-text';
	import IconCheck from '~icons/mdi/check-circle';

	const { data } = $props();

	const { form, errors, enhance, constraints, message, delayed } = superForm(data.form, {
		resetForm: false
	});

	// Same 1-5 scale as the feedback star picker
	const RATING_STARS: Record<string, number> = {
		poor: 1,
		fair: 2,
		good: 3,
		very_good: 4,
		excellent: 5
	};

	function ratingLabel(rating: string) {
		const label = rating.replaceAll('_', ' ');
		return label.charAt(0).toUpperCase() + label.slice(1);
	}

	function ratingColor(rating: string) {
		switch (rating) {
			case 'excellent':
				return 'text-green-400';
			case 'very_good':
				return 'text-teal-400';
			case 'good':
				return 'text-blue-400';
			case 'fair':
				return 'text-yellow-400';
			case 'poor':
				return 'text-red-400';
			default:
				return 'text-gray-400';
		}
	}

	const inputClass =
		'w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-white placeholder-gray-400 transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-500 focus:outline-none';

	const bioLength = $derived($form.bio?.length ?? 0);
</script>

<svelte:head>
	<title>Indy Center | Profile</title>
</svelte:head>

<div class="mb-8 flex flex-wrap items-center gap-4">
	<div>
		<h1 class="text-3xl font-bold text-white">Profile</h1>
		<div class="mt-2 flex flex-wrap items-center gap-3 text-gray-400">
			<MembershipBadge size="sm" membership={data.user!.membership} />
			<span class="font-medium text-gray-200">
				{data.user!.preferredName || `${data.user!.firstName} ${data.user!.lastName}`}
			</span>
			<span class="font-mono text-sm">CID {data.user!.cid}</span>
		</div>
	</div>
</div>

<div class="grid grid-cols-1 gap-6 lg:grid-cols-5">
	<!-- About -->
	<div
		class="h-fit overflow-hidden rounded-lg bg-slate-800/80 shadow-xl backdrop-blur-sm lg:col-span-2"
	>
		<form method="POST" use:enhance class="space-y-6 px-6 py-6">
			<h2 class="text-lg font-semibold text-white">About You</h2>

			<div>
				<label for="bio" class="mb-2 block text-sm font-medium text-gray-300">
					Bio <span class="text-gray-500">(optional)</span>
					{#if $errors.bio}<span class="text-red-400">- {$errors.bio}</span>{/if}
				</label>
				<textarea
					id="bio"
					name="bio"
					rows="6"
					bind:value={$form.bio}
					class={inputClass}
					placeholder="Tell us a bit about yourself: how you got into flight sim, favorite airports, what you fly..."
					aria-invalid={$errors.bio ? 'true' : undefined}
					{...$constraints.bio}
				></textarea>
				<p
					class="mt-1 text-right text-xs {bioLength > MAX_BIO_LENGTH
						? 'text-red-400'
						: 'text-gray-500'}"
				>
					{bioLength} / {MAX_BIO_LENGTH}
				</p>
			</div>

			<div class="flex items-center justify-end gap-4 border-t border-slate-600 pt-6">
				{#if $message}
					<span class="flex items-center gap-1 text-sm text-green-400">
						<IconCheck class="h-4 w-4" />
						{$message}
					</span>
				{/if}
				<button
					type="submit"
					disabled={$delayed}
					class="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-6 py-3 text-sm font-medium text-white shadow-lg transition-all hover:bg-sky-700 hover:shadow-xl focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-800 focus:outline-none disabled:opacity-60"
				>
					Save Profile
				</button>
			</div>
		</form>
	</div>

	<!-- Feedback -->
	{#if data.isController || data.feedback.length > 0}
		<div
			class="h-fit overflow-hidden rounded-lg bg-slate-800/80 shadow-xl backdrop-blur-sm lg:col-span-3"
		>
			<div class="flex items-center justify-between border-b border-slate-700/60 px-6 py-4">
				<h2 class="flex items-center gap-2 text-lg font-semibold text-white">
					<IconMessage class="h-5 w-5" />
					Your Feedback
				</h2>
				<span class="text-sm text-gray-400">{data.feedback.length} approved</span>
			</div>

			{#if data.feedback.length === 0}
				<p class="px-6 py-8 text-center text-sm text-gray-400">
					No approved feedback yet. Once pilot feedback about you is approved, it will show up here.
				</p>
			{:else}
				<ul class="divide-y divide-slate-700/60">
					{#each data.feedback as item (item.id)}
						{@const stars = RATING_STARS[item.rating] ?? 0}
						<li class="px-6 py-4">
							<div class="flex flex-wrap items-center justify-between gap-2">
								<div class="flex items-center gap-2">
									<span
										class="flex {ratingColor(item.rating)}"
										role="img"
										aria-label="{ratingLabel(item.rating)}, {stars} out of 5 stars"
									>
										{#each [1, 2, 3, 4, 5] as n}
											{#if n <= stars}
												<IconStar class="h-4 w-4" />
											{:else}
												<IconStarOutline class="h-4 w-4 text-slate-600" />
											{/if}
										{/each}
									</span>
									<span class="text-sm font-medium {ratingColor(item.rating)}">
										{ratingLabel(item.rating)}
									</span>
								</div>
								<div class="flex items-center gap-3 text-xs text-gray-400">
									<span class="font-mono">{item.position}</span>
									{#if item.createdAt}
										<span>{format(new Date(item.createdAt), 'MMM d, yyyy')}</span>
									{/if}
								</div>
							</div>
							{#if item.feedback?.trim()}
								<p class="mt-2 text-sm whitespace-pre-line text-gray-300">{item.feedback}</p>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/if}
</div>

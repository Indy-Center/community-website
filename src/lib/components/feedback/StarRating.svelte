<script lang="ts">
	// Star picker for the feedback rating. Each star maps to one of the stored rating values,
	// and the inputs are real radio buttons so the form still submits (and is keyboard-usable) as before.
	const RATINGS = [
		{ value: 'poor', label: 'Poor' },
		{ value: 'fair', label: 'Fair' },
		{ value: 'good', label: 'Good' },
		{ value: 'very_good', label: 'Very Good' },
		{ value: 'excellent', label: 'Excellent' }
	] as const;

	let {
		name,
		value = $bindable(),
		invalid = false,
		required = false
	}: {
		name: string;
		value: string;
		invalid?: boolean;
		required?: boolean;
	} = $props();

	let hovered = $state<number | null>(null);

	const selectedIndex = $derived(RATINGS.findIndex((r) => r.value === value));
	const shownIndex = $derived(hovered ?? selectedIndex);
</script>

<div
	role="radiogroup"
	aria-label="Overall Rating"
	aria-invalid={invalid ? 'true' : undefined}
	class="flex items-center gap-3"
>
	<div class="flex items-center gap-1" role="presentation" onmouseleave={() => (hovered = null)}>
		{#each RATINGS as rating, i (rating.value)}
			<label
				class="cursor-pointer rounded p-0.5 transition-transform hover:scale-110 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-sky-500"
				title={rating.label}
				onmouseenter={() => (hovered = i)}
			>
				<input
					type="radio"
					{name}
					value={rating.value}
					bind:group={value}
					{required}
					class="sr-only"
					aria-label={`${i + 1} star${i === 0 ? '' : 's'} - ${rating.label}`}
				/>
				<svg
					class="h-8 w-8 transition-colors {i <= shownIndex ? 'text-yellow-400' : 'text-slate-600'}"
					fill="currentColor"
					viewBox="0 0 24 24"
					aria-hidden="true"
				>
					<path
						d="M12 2.5l2.94 5.96 6.56.95-4.75 4.63 1.12 6.54L12 17.49l-5.87 3.09 1.12-6.54L2.5 9.41l6.56-.95L12 2.5z"
					/>
				</svg>
			</label>
		{/each}
	</div>
	<span class="text-sm text-gray-400">
		{shownIndex >= 0 ? RATINGS[shownIndex].label : 'Select a rating'}
	</span>
</div>

<script lang="ts">
	type Props = {
		rating: string;
	};

	let { rating }: Props = $props();

	const ratingClasses = {
		DEFAULT: 'bg-gray-50 text-gray-500 border border-gray-200',
		Student1: 'bg-sky-50 text-sky-600 border border-sky-200',
		Student2: 'bg-green-50 text-green-500 border border-green-200',
		Controller1: 'bg-red-50 text-red-500 border border-red-200',
		Controller3: 'bg-orange-50 text-orange-500 border border-orange-200',
		Instructor1: 'bg-purple-50 text-purple-500 border border-purple-200'
	};

	// Student1 = S1, Student2 = S2
	const shortRating = $derived.by(() => {
		return rating.replace('Student', 'S').replace('Controller', 'C').replace('Instructor', 'I');
	});
</script>

<div class="flex items-center gap-2">
	<span
		class="flex-shrink-0 rounded px-1.5 py-0.5 text-xs {ratingClasses[
			rating as keyof typeof ratingClasses
		]}">{shortRating}</span
	>
</div>

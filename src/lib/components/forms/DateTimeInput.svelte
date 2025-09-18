<script lang="ts">
	import { TZDate } from '@date-fns/tz';
	import { format } from 'date-fns';
	import { dateProxy } from 'sveltekit-superforms';

	interface Props {
		form: any;
		errors: any;
		constraints: any;
		fieldName: string;
		label: string;
		placeholder?: string;
	}

	let { form, errors, constraints, fieldName, label, placeholder }: Props = $props();

	const dateTimeProxy = dateProxy(form, fieldName, { format: 'datetime-local' });

	// Get browser timezone for display
	const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
</script>

<div class="space-y-3">
	<label class="block text-sm font-medium text-gray-300" for={fieldName}>
		{label}
		{#if errors[fieldName]}
			<span class="text-red-400">- {errors[fieldName]}</span>
		{/if}
	</label>

	<!-- Local Time Input -->
	<div>
		<div class="mb-2 text-xs text-gray-400">
			Enter in your local time ({browserTimeZone})
		</div>
		<input
			id={fieldName}
			type="datetime-local"
			bind:value={$dateTimeProxy}
			class="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-white placeholder-gray-400 transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-500 focus:outline-none"
			{placeholder}
			aria-invalid={errors[fieldName] ? 'true' : undefined}
			{...constraints[fieldName]}
		/>
	</div>

	<!-- UTC Time Display -->
	{#if $form[fieldName]}
		<div class="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs">
			<div class="flex items-center gap-2">
				<span class="h-2 w-2 rounded-full bg-orange-400"></span>
				<span class="font-medium text-orange-400">UTC (Zulu):</span>
				<span class="font-mono text-white"
					>{format(new TZDate($form[fieldName], 'UTC'), 'yyyy-MM-dd HH:mm')}</span
				>
			</div>
		</div>
	{/if}

	<!-- Hidden input for form submission (UTC value) -->
	<input type="hidden" name={fieldName} bind:value={$form[fieldName]} />
</div>

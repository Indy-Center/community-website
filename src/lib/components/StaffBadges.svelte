<script lang="ts">
	import { STAFF_BADGES, type StaffBadgeKey } from '$lib/config/staffBadges';
	import Tooltip from '$lib/components/Tooltip.svelte';
	import IconShield from '~icons/mdi/shield-star';
	import IconSchool from '~icons/mdi/school';
	import IconGroup from '~icons/mdi/account-group';

	let { badges }: { badges: StaffBadgeKey[] } = $props();

	const STYLES = {
		senior: { icon: IconShield, class: 'bg-amber-600/80' },
		training: { icon: IconSchool, class: 'bg-rose-600/80' },
		team: { icon: IconGroup, class: 'bg-slate-600/80' }
	};

	// Keep the configured display order regardless of the order badges were passed in
	const shown = $derived(STAFF_BADGES.filter((badge) => badges.includes(badge.key)));
</script>

{#each shown as badge (badge.key)}
	{@const style = STYLES[badge.group]}
	<Tooltip text={badge.title}>
		<span
			class="inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-xs font-semibold text-white {style.class}"
		>
			<style.icon class="h-3 w-3" aria-hidden="true" />
			{badge.label}
			<span class="sr-only">({badge.title})</span>
		</span>
	</Tooltip>
{/each}

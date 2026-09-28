<script lang="ts">
	import { STAFF_BADGES, type StaffBadgeKey } from '$lib/config/staffBadges';
	import IconShield from '~icons/mdi/shield-star';
	import IconSchool from '~icons/mdi/school';
	import IconGroup from '~icons/mdi/account-group';

	let { badges }: { badges: StaffBadgeKey[] } = $props();

	const STYLES = {
		senior: { icon: IconShield, class: 'bg-amber-500/20 text-amber-200 ring-amber-400/30' },
		training: { icon: IconSchool, class: 'bg-emerald-600/20 text-emerald-200 ring-emerald-400/30' },
		team: { icon: IconGroup, class: 'bg-violet-600/20 text-violet-200 ring-violet-400/30' }
	};

	// Keep the configured display order regardless of the order badges were passed in
	const shown = $derived(STAFF_BADGES.filter((badge) => badges.includes(badge.key)));
</script>

{#each shown as badge (badge.key)}
	{@const style = STYLES[badge.group]}
	<span
		class="inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-xs font-semibold ring-1 {style.class}"
		title={badge.title}
	>
		<style.icon class="h-3 w-3" aria-hidden="true" />
		{badge.label}
		<span class="sr-only">({badge.title})</span>
	</span>
{/each}

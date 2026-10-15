<!--
	A partner's Social link: the platform's icon, linking to the partner's address there, named
	"<partner> on <platform>" for screen readers. `card` is the small one on the partners list;
	`bar` is the square button under a partner's banner.
-->
<script lang="ts" module>
	import type { Component } from 'svelte';
	import type { SocialPlatform } from '$lib/server/cms/types';
	import IconTwitch from '~icons/simple-icons/twitch';
	import IconYoutube from '~icons/simple-icons/youtube';
	import IconDiscord from '~icons/simple-icons/discord';
	import IconX from '~icons/simple-icons/x';
	import IconInstagram from '~icons/simple-icons/instagram';
	import IconTiktok from '~icons/simple-icons/tiktok';
	import IconFacebook from '~icons/simple-icons/facebook';
	import IconGithub from '~icons/simple-icons/github';
	import IconWeb from '~icons/mdi/web';

	const platforms: Record<SocialPlatform, { name: string; icon: Component }> = {
		twitch: { name: 'Twitch', icon: IconTwitch },
		youtube: { name: 'YouTube', icon: IconYoutube },
		discord: { name: 'Discord', icon: IconDiscord },
		x: { name: 'X', icon: IconX },
		instagram: { name: 'Instagram', icon: IconInstagram },
		tiktok: { name: 'TikTok', icon: IconTiktok },
		facebook: { name: 'Facebook', icon: IconFacebook },
		github: { name: 'GitHub', icon: IconGithub },
		web: { name: 'Website', icon: IconWeb }
	};

	const variants = {
		card: { link: 'hover:text-white', icon: 'h-4 w-4' },
		bar: {
			link: 'flex h-11 w-11 items-center justify-center rounded-lg bg-slate-900/60 text-slate-300 transition-colors hover:bg-slate-700 hover:text-white',
			icon: 'h-5 w-5'
		}
	};
</script>

<script lang="ts">
	let {
		partnerName,
		link,
		variant
	}: {
		partnerName: string;
		link: { platform: SocialPlatform; url: string };
		variant: keyof typeof variants;
	} = $props();

	const platform = $derived(platforms[link.platform]);
	const Icon = $derived(platform.icon);
</script>

<a
	href={link.url}
	aria-label="{partnerName} on {platform.name}"
	title={platform.name}
	class={variants[variant].link}
>
	<Icon class={variants[variant].icon} aria-hidden="true" />
</a>

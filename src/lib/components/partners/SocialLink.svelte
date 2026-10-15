<!--
	A partner's Social link: the platform's icon, linking to the partner's address there, named
	"<partner> on <platform>" for screen readers. A link on a platform the site has no icon for
	(`other`) gets a plain link icon and is named for its site, "<partner> on example.com".
	`card` is the small icon on the partners list;
	`bar` is the square button under a partner's banner. Both are 44px square so they can be tapped
	on a phone.
-->
<script lang="ts" module>
	import type { Component } from 'svelte';
	import type { SocialPlatform } from '$lib/cms/types';
	import type { SocialLink } from '$lib/partners';
	import IconTwitch from '~icons/simple-icons/twitch';
	import IconYoutube from '~icons/simple-icons/youtube';
	import IconDiscord from '~icons/simple-icons/discord';
	import IconX from '~icons/simple-icons/x';
	import IconInstagram from '~icons/simple-icons/instagram';
	import IconTiktok from '~icons/simple-icons/tiktok';
	import IconFacebook from '~icons/simple-icons/facebook';
	import IconGithub from '~icons/simple-icons/github';
	import IconWeb from '~icons/mdi/web';
	import IconLink from '~icons/mdi/link-variant';

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

	/** The site a link on an `other` platform goes to, such as "example.com". */
	function siteName(url: string) {
		try {
			return new URL(url).hostname.replace(/^www\./, '');
		} catch {
			return 'another site';
		}
	}

	const variants = {
		card: {
			link: 'flex h-11 w-11 items-center justify-center rounded-lg transition-colors hover:bg-slate-700/60 hover:text-white',
			icon: 'h-4 w-4'
		},
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
		link: SocialLink;
		variant: keyof typeof variants;
	} = $props();

	const platform = $derived(
		link.platform === 'other'
			? { name: siteName(link.url), icon: IconLink }
			: platforms[link.platform]
	);
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

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

	/** What a screen reader should call a social link's platform. */
	export function platformName(platform: SocialPlatform) {
		return platforms[platform].name;
	}
</script>

<script lang="ts">
	let { platform, class: className = 'h-5 w-5' }: { platform: SocialPlatform; class?: string } =
		$props();

	const Icon = $derived(platforms[platform].icon);
</script>

<Icon class={className} aria-hidden="true" />

<!--
	A partner's Social link: the platform's icon, linking to the partner's address there, named
	"<partner> on <platform>" for screen readers. A link on a platform the site has no icon for
	(`other`) gets a plain link icon and is named for its site, "<partner> on example.com".
	`card` is the small icon on the partners list;
	`bar` is the square button under a partner's banner. Both are 44px square so they can be tapped
	on a phone.
-->
<script lang="ts" module>
	import type { SocialPlatform } from '$lib/cms/types';
	import type { SocialLink } from '$lib/partners';
	import { mdiGithub, mdiLinkVariant, mdiWeb } from '@mdi/js';
	import {
		brandDiscord,
		brandFacebook,
		brandInstagram,
		brandTiktok,
		brandTwitch,
		brandX,
		brandYoutube
	} from '$lib/brandIcons';

	const platforms: Record<SocialPlatform, { name: string; icon: string }> = {
		twitch: { name: 'Twitch', icon: brandTwitch },
		youtube: { name: 'YouTube', icon: brandYoutube },
		discord: { name: 'Discord', icon: brandDiscord },
		x: { name: 'X', icon: brandX },
		instagram: { name: 'Instagram', icon: brandInstagram },
		tiktok: { name: 'TikTok', icon: brandTiktok },
		facebook: { name: 'Facebook', icon: brandFacebook },
		github: { name: 'GitHub', icon: mdiGithub },
		web: { name: 'Website', icon: mdiWeb }
	};

	/** The site a link on an `other` platform goes to, such as "example.com". */
	function siteName(url: string) {
		try {
			return new URL(url).hostname.replace(/^www\./, '');
		} catch {
			return 'another site';
		}
	}

	// Both 44px square, so they can be tapped on a phone
	const variants = {
		card: { link: 'text-muted-foreground hover:bg-muted hover:text-foreground', size: 16 },
		bar: { link: 'bg-muted text-foreground-soft hover:text-foreground', size: 20 }
	};
</script>

<script lang="ts">
	import { Icon } from '@indy-center/centerline-svelte';

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
			? { name: siteName(link.url), icon: mdiLinkVariant }
			: platforms[link.platform]
	);
</script>

<a
	href={link.url}
	aria-label="{partnerName} on {platform.name}"
	class="flex size-11 items-center justify-center rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-ring {variants[
		variant
	].link}"
>
	<Icon path={platform.icon} size={variants[variant].size} />
</a>

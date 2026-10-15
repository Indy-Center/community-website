import type { Image, PartnersDocument } from '$lib/cms/types';

/**
 * What the CMS serves, shaped exactly like the contract in `$lib/cms/types`. Typed against
 * it, so a change to the contract that the fixtures do not follow fails `npm run check`.
 *
 * Every partner here is made up. The repository is public: never paste a real partner's details
 * or member perk into a fixture.
 */

function image(name: string, width = 256, height = 256): Image {
	return {
		url: `https://cms.example.test/media/${name}`,
		alt: name,
		width,
		height
	};
}

export const partners: PartnersDocument = {
	categories: [
		{
			id: 'cat-developers',
			name: 'Developers',
			blurb: 'Scenery and tools made for flying through Indy.',
			partners: [
				{
					slug: 'example-scenery',
					name: 'Example Scenery Co.',
					tagline: 'Hand-built airports for the Example region.',
					description: 'We build airports.\n\nLots of them.',
					logo: image('example-scenery-logo.png'),
					banner: image('example-scenery-banner.jpg', 2400, 750),
					callsToAction: [
						{ label: 'Visit website', url: 'https://scenery.example.test' },
						{ label: 'Download KXMP', url: 'https://scenery.example.test/kxmp' }
					],
					memberPerks: [
						{
							label: 'Claim discount',
							url: 'https://scenery.example.test/claim',
							text: 'SECRET-PERK-1: 20% off with code EXAMPLE20.'
						}
					],
					socialLinks: [{ platform: 'discord', url: 'https://discord.example.test/scenery' }],
					gallery: [
						{ thumbnail: image('kxmp-thumb.jpg', 400, 225), large: image('kxmp.jpg', 1600, 900) }
					]
				},
				{
					slug: 'sample-tools',
					name: 'Sample Tools',
					tagline: 'Little utilities for controllers.',
					description: 'A strip printer and a clock.',
					logo: image('sample-tools-logo.svg'),
					banner: null,
					callsToAction: [{ label: 'Get the tools', url: 'https://tools.example.test' }],
					memberPerks: [],
					socialLinks: [{ platform: 'github', url: 'https://github.example.test/sample-tools' }],
					gallery: []
				}
			]
		},
		{
			id: 'cat-creators',
			name: 'Creators',
			blurb: 'Streamers who fly and control with us.',
			partners: [
				{
					slug: 'pretend-streamer',
					name: 'Pretend Streamer',
					tagline: 'Weekly group flights into Example Field.',
					description: 'Streams every Friday.',
					logo: image('pretend-streamer-logo.webp'),
					banner: null,
					callsToAction: [{ label: 'Watch live', url: 'https://twitch.example.test/pretend' }],
					memberPerks: [],
					socialLinks: [
						{ platform: 'twitch', url: 'https://twitch.example.test/pretend' },
						{ platform: 'youtube', url: 'https://youtube.example.test/pretend' }
					],
					gallery: []
				}
			]
		}
	]
};

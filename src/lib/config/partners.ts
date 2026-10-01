export const PARTNER_CATEGORIES = [
	{
		key: 'developer',
		label: 'Developer',
		description: 'Developers whose tools, scenery, and software we fly and control with.'
	},
	{
		key: 'creator',
		label: 'Creator',
		description: 'Streamers and content creators who share the network with their audiences.'
	},
	{
		key: 'community',
		label: 'Community',
		description: 'Virtual airlines, groups, and organizations we work alongside.'
	}
] as const;

export type PartnerCategory = (typeof PARTNER_CATEGORIES)[number]['key'];

export const PARTNER_CATEGORY_KEYS = PARTNER_CATEGORIES.map((category) => category.key) as [
	PartnerCategory,
	...PartnerCategory[]
];

export function getPartnerCategory(key: string) {
	return PARTNER_CATEGORIES.find((category) => category.key === key);
}

// Partners in each category, in category order, leaving out empty categories. Expects
// partners already sorted the way they should appear.
export function groupPartnersByCategory<T extends { category: string }>(partners: T[]) {
	return PARTNER_CATEGORIES.map((category) => ({
		...category,
		partners: partners.filter((partner) => partner.category === category.key)
	})).filter((group) => group.partners.length > 0);
}

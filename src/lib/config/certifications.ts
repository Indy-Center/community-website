// Certification and Endorsement Configuration
// Centralized configuration for all certifications and endorsements

export interface CertificationConfig {
	key: string;
	displayName: string;
	description?: string;
}

export interface EndorsementConfig {
	key: string;
	displayName: string;
	description?: string;
}

// Available certifications in order of progression
export const CERTIFICATIONS: CertificationConfig[] = [
	{
		key: 'DEL',
		displayName: 'Clearance Delivery Certified',
		description: 'Certified to provide clearance delivery services'
	},
	{
		key: 'GND',
		displayName: 'Ground Certified',
		description: 'Certified to provide ground control services'
	},
	{
		key: 'TWR',
		displayName: 'Tower Certified',
		description: 'Certified to provide tower control services'
	},
	{
		key: 'APP',
		displayName: 'Approach Certified',
		description: 'Certified to provide approach/departure control services'
	},
	{
		key: 'CTR',
		displayName: 'Center Certified',
		description: 'Certified to provide center control services'
	}
];

// Available endorsements
export const ENDORSEMENTS: EndorsementConfig[] = [
	{
		key: 'S-GND',
		displayName: 'Simple Ground Endorsement',
		description: 'Simple ground control endorsement'
	},
	{
		key: 'S-TWR',
		displayName: 'Simple Tower Endorsement',
		description: 'Simple tower control endorsement'
	},
	{
		key: 'T2-CTR',
		displayName: 'Tier 2 Center Endorsement',
		description: 'Tier 2 center control endorsement'
	},
	{
		key: 'APP-SOLO',
		displayName: 'Approach Solo Endorsement',
		description: 'Solo approach/departure control endorsement'
	},
	{
		key: 'TWR-SOLO',
		displayName: 'Tower Solo Endorsement',
		description: 'Solo tower control endorsement'
	}
];

// Helper functions to get configuration by key
export function getCertificationConfig(key: string): CertificationConfig | undefined {
	return CERTIFICATIONS.find(cert => cert.key === key);
}

export function getEndorsementConfig(key: string): EndorsementConfig | undefined {
	return ENDORSEMENTS.find(endorsement => endorsement.key === key);
}

// Helper functions to get display names
export function getCertificationDisplayName(key: string): string {
	const config = getCertificationConfig(key);
	return config?.displayName || `${key} Certified`;
}

export function getEndorsementDisplayName(key: string): string {
	const config = getEndorsementConfig(key);
	return config?.displayName || key;
}

// Get certification order for sorting
export function getCertificationOrder(certification: string | null): number {
	if (!certification) return -1;
	const index = CERTIFICATIONS.findIndex(cert => cert.key === certification);
	return index === -1 ? 999 : index;
}
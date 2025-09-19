import { env } from '$env/dynamic/private';
import { USE_MOCK_DATA } from '$lib/mocks';
import type { VatsimUserDataResponse, VatsimUserData } from '$lib/types/vatsim';
import { logger } from '$lib/server/logger';

// Re-export VatsimUserData for convenience
export type { VatsimUserData } from '$lib/types/vatsim';

export async function fetchUserData(accessToken: string): Promise<VatsimUserData | null> {
	try {
		const response = await fetch(`${env.CONNECT_BASE_URL!}/api/user`, {
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${accessToken}`
			}
		});

		if (!response.ok) {
			logger.error('Failed to fetch user details', { status: response.status });
			return null;
		}

		return (await response.json<VatsimUserDataResponse>()).data;
	} catch (error) {
		logger.error('Error during user details fetch', error);
		return null;
	}
}

import { env } from '$env/dynamic/private';
import type { VatsimUserDataResponse, VatsimUserData } from '$lib/types/vatsim';
import { logger } from '$lib/server/logger';

// Re-export VatsimUserData for convenience
export type { VatsimUserData } from '$lib/types/vatsim';

export async function fetchUserData(accessToken: string): Promise<VatsimUserData | null> {
	logger.debug('Fetching user data from VATSIM Connect API');

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

		const userData = (await response.json<VatsimUserDataResponse>()).data;
		logger.debug('Successfully fetched user data', { cid: userData.cid });
		return userData;
	} catch (error) {
		logger.error('Error during user details fetch', error);
		return null;
	}
}

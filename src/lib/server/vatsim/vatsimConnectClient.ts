import { env } from '$env/dynamic/private';
import { USE_MOCK_DATA } from '$lib/mocks';
import type { VatsimUserDataResponse, VatsimUserData } from '$lib/types/vatsim';

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
			console.error('Failed to fetch user details', { status: response.status });
			return null;
		}

		return (await response.json<VatsimUserDataResponse>()).data;
	} catch (error) {
		console.error('Error during user details fetch', error);
		return null;
	}
}

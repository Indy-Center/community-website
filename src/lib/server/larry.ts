import type { ChannelSend, LarryBinding, Links } from '@indy-center/indy-larry-worker';
import { logger } from '$lib/server/logger';

export type { LarryBinding, Links };
export type LarryMessage = ChannelSend;

// Names from Larry's SEND_CHANNELS setting, not channel IDs
export enum LarryChannel {
	FEEDBACK = 'controller-feedback',
	SENIOR_STAFF_ALERTS = 'senior-staff-alerts'
}

/**
 * A member's linked accounts as larry reports them (`getLinks`): the Discord account the role
 * sync uses, linked or known from VATUSA, and their TeamSpeak identity. Null when larry can't be
 * asked; the failure is logged.
 */
export async function readLinks(
	larry: LarryBinding | undefined,
	cid: string
): Promise<Links | null> {
	try {
		if (!larry) throw new Error('The LARRY binding is not set');
		return await larry.getLinks(Number(cid));
	} catch (error) {
		logger.error(`Could not read the linked accounts of ${cid} from Larry`, error);
		return null;
	}
}

/**
 * Asks larry to sync one member now (`syncMembers`), as after a name change. `declined` when
 * larry won't yet (its 2-minute cooldown), `failed` when it can't be asked; that is logged and
 * never fails the caller.
 */
export async function resyncMember(
	larry: LarryBinding | undefined,
	cid: string
): Promise<'queued' | 'declined' | 'failed'> {
	try {
		if (!larry) throw new Error('The LARRY binding is not set');
		const [result] = await larry.syncMembers([Number(cid)]);
		if (result?.queued) return 'queued';
		logger.info(`Larry declined to sync ${cid}`, result);
		return 'declined';
	} catch (error) {
		logger.error(`Could not ask Larry to sync ${cid}`, error);
		return 'failed';
	}
}

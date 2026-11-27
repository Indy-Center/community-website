import type { ChannelSend, LarryBinding, Links } from '@indy-center/indy-larry-worker';
import { SYNC_QUEUED } from '$lib/profile/linkedAccounts';
import { logger } from '$lib/server/logger';

export type { LarryBinding, Links };
export type LarryMessage = ChannelSend;

// Names from Larry's SEND_CHANNELS setting, not channel IDs
export enum LarryChannel {
	CONTROLLER_ANNOUNCEMENTS = 'controller-announcements',
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

export type Resync =
	| { outcome: 'queued' }
	| { outcome: 'declined'; reason: string }
	| { outcome: 'failed'; error: string };

/**
 * Asks larry to sync one member now (`syncMembers`), as after a name change or from a sync
 * button. `declined`, with larry's reason, when larry won't yet (its 2-minute cooldown);
 * `failed`, with the error's message, when it can't be asked. That is logged and never fails
 * the caller.
 */
export async function resyncMember(larry: LarryBinding | undefined, cid: string): Promise<Resync> {
	try {
		if (!larry) throw new Error('The LARRY binding is not set');
		const [result] = await larry.syncMembers([Number(cid)]);
		if (!result) throw new Error('Larry answered for no CID');
		if (result.queued) return { outcome: 'queued' };
		logger.info(`Larry declined to sync ${cid}`, result);
		return { outcome: 'declined', reason: result.reason };
	} catch (error) {
		logger.error(`Could not ask Larry to sync ${cid}`, error);
		return { outcome: 'failed', error: errorMessage(error) };
	}
}

/** What the sync buttons ("Sync my roles", the admin's "Sync roles") say about a resync. */
export function syncedMessage(synced: Resync): {
	level: 'success' | 'info' | 'danger';
	message: string;
} {
	if (synced.outcome === 'queued') return { level: 'success', message: SYNC_QUEUED };
	if (synced.outcome === 'declined') return { level: 'info', message: synced.reason };
	return { level: 'danger', message: synced.error };
}

/** What a larry call threw, as larry worded it. */
export const errorMessage = (error: unknown) =>
	error instanceof Error ? error.message : String(error);

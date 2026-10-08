import type { ChannelSend, LarryBinding } from '@indy-center/indy-larry-worker';

export type { LarryBinding };
export type LarryMessage = ChannelSend;

// Names from Larry's SEND_CHANNELS setting, not channel IDs
export enum LarryChannel {
	FEEDBACK = 'feedback',
	SENIOR_STAFF_ALERTS = 'senior-staff-alerts'
}

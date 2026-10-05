import type { DiscordEmbed } from '$lib/server/discord';

// Mirrors the RPC surface of the `indy-larry` Worker (worker/src/client/api.ts in
// Indy-Center/indy-larry). Swap for `import type { LarryBinding } from '@indy-center/larry'`
// once that package is on npm.
export type LarryMessage = {
	channel: string;
	content?: string;
	embeds?: Partial<DiscordEmbed>[];
};

export type LarryBinding = {
	send(message: LarryMessage): Promise<{ channelId: string; messageId: string }>;
	enqueue(message: LarryMessage): Promise<void>;
};

// Names from Larry's SEND_CHANNELS setting, not channel IDs
export enum LarryChannel {
	FEEDBACK = 'feedback',
	SENIOR_STAFF_ALERTS = 'senior-staff-alerts'
}

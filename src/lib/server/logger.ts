import { consola } from 'consola';
import * as Sentry from '@sentry/sveltekit';

// Custom Sentry reporter for consola that works in Cloudflare Workers
const sentryReporter = {
	log: (logObj: any) => {
		const { level, message, args, date, tag } = logObj;

		// Map consola levels to Sentry levels
		const levelMap: Record<number, string> = {
			0: 'debug',
			1: 'info',
			2: 'warn',
			3: 'error'
		};

		const sentryLevel = levelMap[level] || 'info';

		// Only send warn and error levels to Sentry to avoid spam
		if (level >= 2) {
			const logMessage = typeof message === 'string' ? message : JSON.stringify(message);
			const context = {
				level: sentryLevel,
				tag,
				args: args?.length ? args : undefined,
				timestamp: date
			};

			if (level === 3) {
				// Error level - create an error in Sentry
				Sentry.captureException(new Error(logMessage), {
					level: 'error',
					extra: context
				});
			} else {
				// Warning level - send as message
				Sentry.captureMessage(logMessage, {
					level: 'warning',
					extra: context
				});
			}
		}
	}
};

// Add the custom Sentry reporter to consola
consola.addReporter(sentryReporter);

export const logger = consola;
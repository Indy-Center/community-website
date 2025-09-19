import { consola } from 'consola';
import * as Sentry from '@sentry/sveltekit';

// Create Sentry reporter for consola
const sentryReporter = Sentry.createConsolaReporter({
	levels: ['error', 'warn', 'info']
});

// Add the Sentry reporter to consola
consola.addReporter(sentryReporter);

export const logger = consola;
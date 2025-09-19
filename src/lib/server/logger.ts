import { logger } from '$lib/logger';
import * as Sentry from '@sentry/cloudflare';

// Create a Sentry reporter for consola
const sentryReporter = Sentry.createConsolaReporter();
// Add the reporter to consola
logger.addReporter(sentryReporter);

export { logger };

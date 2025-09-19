import { consola } from 'consola';
import { browser } from '$app/environment';

// Browser-compatible logger configuration
let logger = consola;

if (browser) {
	// In browser environment, Sentry integration is handled via hooks.client.ts
	// No need to add additional reporters here since Sentry already captures console logs
	logger = consola.withTag('client');
} else {
	// Server-side logger is configured in lib/server/logger.ts
	logger = consola.withTag('server');
}

export { logger };
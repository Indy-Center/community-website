import { handleErrorWithSentry, replayIntegration } from '@sentry/sveltekit';
import * as Sentry from '@sentry/sveltekit';

Sentry.init({
	dsn: 'https://7eb744b3548181e2660a874c28f50201@o4510043972304896.ingest.us.sentry.io/4510043975843840',

	tracesSampleRate: 1.0,

	enableLogs: true,

	// This sets the sample rate to be 10%. You may want this to be 100% while
	// in development and sample at a lower rate in production
	replaysSessionSampleRate: 0.1,

	// If the entire session is not sampled, use the below sample rate to sample
	// sessions when an error occurs.
	replaysOnErrorSampleRate: 1.0,

	// If you don't want to use Session Replay, just remove the line below:
	integrations: [
		replayIntegration(),
		Sentry.consoleLoggingIntegration({ levels: ['log', 'warn', 'error'] })
	]
});

// If you have a custom error handler, pass it to `handleErrorWithSentry`
export const handleError = handleErrorWithSentry();

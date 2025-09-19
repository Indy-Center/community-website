import * as Sentry from '@sentry/sveltekit';

Sentry.init({
	dsn: 'https://7eb744b3548181e2660a874c28f50201@o4510043972304896.ingest.us.sentry.io/4510043975843840',

	tracesSampleRate: 1.0,

	// Enable logs to be sent to Sentry
	enableLogs: true

	// uncomment the line below to enable Spotlight (https://spotlightjs.com)
	// spotlight: import.meta.env.DEV,
});

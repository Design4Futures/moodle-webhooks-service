import type { ErrorHandlerConfig } from '../handler/types';
import { FastifyErrorLogger } from './FastifyErrorLogger';

export function createDefaultErrorConfig(
	// biome-ignore lint/suspicious/noExplicitAny: Fastify logger type flexibility
	fastifyLogger?: any,
): ErrorHandlerConfig {
	const isProduction = process.env.NODE_ENV === 'production';
	const isDevelopment = process.env.NODE_ENV === 'development';

	return {
		logger: new FastifyErrorLogger(fastifyLogger),
		includeStackTrace: !isProduction,
		logLevel: isDevelopment ? 'debug' : 'error',
		enableDetailedErrors: !isProduction,
		enableErrorMetrics: true,
	};
}

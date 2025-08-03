import type { FastifyInstance } from 'fastify';
import { ErrorHandler } from '../handler/ErrorHandler';
import { createDefaultErrorConfig } from './create-default-config';
import { setGlobalErrorHandler } from './global-error-handler';
import { setupFastifyErrorHandling } from './setup-fastify-error-handling';
import { setupProcessErrorHandlers } from './setup-process-error-handlers';

export function initializeErrorHandling(
	fastifyInstance?: FastifyInstance,
): ErrorHandler {
	const config = createDefaultErrorConfig(fastifyInstance?.log);
	const globalErrorHandler = new ErrorHandler(config);
	setGlobalErrorHandler(globalErrorHandler);

	if (fastifyInstance) {
		setupFastifyErrorHandling(fastifyInstance, globalErrorHandler);
	}

	setupProcessErrorHandlers(globalErrorHandler);

	return globalErrorHandler;
}

import type { FastifyInstance } from 'fastify';
import { ErrorHandler } from '../handler/ErrorHandler';
import type { ErrorHandlerConfig } from '../handler/types';
import { FastifyErrorLogger } from './FastifyErrorLogger';
import { setGlobalErrorHandler } from './global-error-handler';
import { setupFastifyErrorHandling } from './setup-fastify-error-handling';
import { setupProcessErrorHandlers } from './setup-process-error-handlers';
import type { ErrorHandlingOptions } from './types';

export function configureErrorHandling(
	fastifyInstance: FastifyInstance,
	options: ErrorHandlingOptions = {},
): ErrorHandler {
	const config: ErrorHandlerConfig = {
		logger: options.customLogger || new FastifyErrorLogger(fastifyInstance.log),
		includeStackTrace:
			options.enableStackTrace ?? process.env.NODE_ENV !== 'production',
		logLevel:
			options.logLevel ??
			(process.env.NODE_ENV === 'development' ? 'debug' : 'error'),
		enableDetailedErrors:
			options.enableDetailedErrors ?? process.env.NODE_ENV !== 'production',
		enableErrorMetrics: options.enableMetrics ?? true,
	};

	const globalErrorHandler = new ErrorHandler(config);
	setGlobalErrorHandler(globalErrorHandler);
	setupFastifyErrorHandling(fastifyInstance, globalErrorHandler);
	setupProcessErrorHandlers(globalErrorHandler);

	return globalErrorHandler;
}

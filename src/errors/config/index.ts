export { configureErrorHandling } from './configure-error-handling';
export { createDefaultErrorConfig } from './create-default-config';
export { createErrorContextMiddleware } from './create-error-context-middleware';
export { createErrorHealthCheck } from './create-error-health-check';
export { createErrorWrapper } from './create-error-wrapper';
export { FastifyErrorLogger } from './FastifyErrorLogger';
export {
	getGlobalErrorHandler,
	setGlobalErrorHandler,
} from './global-error-handler';
export { initializeErrorHandling } from './initialize-error-handling';
export { setupFastifyErrorHandling } from './setup-fastify-error-handling';
export { setupGracefulShutdown } from './setup-graceful-shutdown';
export { setupProcessErrorHandlers } from './setup-process-error-handlers';
export type { ErrorHandlingOptions } from './types';

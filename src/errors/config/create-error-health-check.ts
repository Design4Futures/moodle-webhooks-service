import { getGlobalErrorHandler } from './global-error-handler';

export function createErrorHealthCheck() {
	const errorHandler = getGlobalErrorHandler();

	return {
		errorMetrics: errorHandler.getErrorMetrics(),
		isHealthy: true,
		timestamp: new Date().toISOString(),
	};
}

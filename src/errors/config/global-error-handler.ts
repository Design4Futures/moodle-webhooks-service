import type { ErrorHandler } from '../handler/ErrorHandler';

let globalErrorHandler: ErrorHandler | null = null;

export function setGlobalErrorHandler(handler: ErrorHandler): void {
	globalErrorHandler = handler;
}

export function getGlobalErrorHandler(): ErrorHandler {
	if (!globalErrorHandler) {
		throw new Error(
			'Error handler not initialized. Call initializeErrorHandling() first.',
		);
	}
	return globalErrorHandler;
}

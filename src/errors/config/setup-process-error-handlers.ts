import type { ErrorHandler } from '../handler/ErrorHandler';

export function setupProcessErrorHandlers(errorHandler: ErrorHandler): void {
	process.on('uncaughtException', (error: Error) => {
		console.error('Uncaught Exception:', error);
		errorHandler.handleError(error, { source: 'uncaughtException' });

		if (process.env.NODE_ENV === 'production') {
			process.exit(1);
		}
	});

	process.on(
		'unhandledRejection',
		(reason: unknown, promise: Promise<unknown>) => {
			const error =
				reason instanceof Error
					? reason
					: new Error(`Unhandled rejection: ${reason}`);

			console.error('Unhandled Rejection at:', promise, 'reason:', reason);
			errorHandler.handleError(error, {
				source: 'unhandledRejection',
				promise: promise.toString(),
				reason: reason?.toString(),
			});

			if (process.env.NODE_ENV === 'production') {
				process.exit(1);
			}
		},
	);

	process.on('warning', (warning: Error) => {
		errorHandler.handleError(warning, { source: 'processWarning' });
	});
}

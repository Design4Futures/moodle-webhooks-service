import type { FastifyInstance } from 'fastify';
import type { ErrorHandler } from '../handler/ErrorHandler';

export function setupFastifyErrorHandling(
	fastifyInstance: FastifyInstance,
	errorHandler: ErrorHandler,
): void {
	fastifyInstance.setErrorHandler(async (error, request, reply) => {
		await errorHandler.handleFastifyError(error, request, reply);
	});

	fastifyInstance.addHook('onError', async (request, _reply, error) => {
		const context = {
			requestId: request.id,
			method: request.method,
			url: request.url,
			ip: request.ip,
			userAgent: request.headers['user-agent'],
		};

		errorHandler.handleError(error, context);
	});

	fastifyInstance.addHook('onResponse', async (request, reply) => {
		const statusCode = reply.statusCode;

		if (statusCode >= 400) {
			const context = {
				requestId: request.id,
				method: request.method,
				url: request.url,
				statusCode,
				ip: request.ip,
			};

			const logLevel = statusCode >= 500 ? 'error' : 'warn';

			if (logLevel === 'error') {
				fastifyInstance.log.error(context, `HTTP ${statusCode} response`);
			} else {
				fastifyInstance.log.warn(context, `HTTP ${statusCode} response`);
			}
		}
	});
}

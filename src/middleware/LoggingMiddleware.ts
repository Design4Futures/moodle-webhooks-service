import type { FastifyReply, FastifyRequest } from 'fastify';
import { v4 as uuidv4 } from 'uuid';

export interface LogContext {
	requestId: string;
	userId?: string | number;
	eventType?: string;
	startTime: number;
	ip: string;
	userAgent?: string | undefined;
}

export namespace StructuredLogger {
	export function createRequestContext(request: FastifyRequest): LogContext {
		return {
			requestId: uuidv4(),
			startTime: Date.now(),
			ip: request.ip,
			userAgent: request.headers['user-agent'],
		};
	}

	export function logRequest(
		context: LogContext,
		request: FastifyRequest,
	): void {
		console.log(
			JSON.stringify({
				level: 'info',
				timestamp: new Date().toISOString(),
				type: 'request',
				requestId: context.requestId,
				method: request.method,
				url: request.url,
				ip: context.ip,
				userAgent: context.userAgent,
			}),
		);
	}

	export function logResponse(
		context: LogContext,
		reply: FastifyReply,
		additionalData?: Record<string, unknown>,
	): void {
		const duration = Date.now() - context.startTime;

		console.log(
			JSON.stringify({
				level: 'info',
				timestamp: new Date().toISOString(),
				type: 'response',
				requestId: context.requestId,
				statusCode: reply.statusCode,
				duration,
				...additionalData,
			}),
		);
	}

	export function logError(
		context: LogContext,
		error: Error,
		additionalData?: Record<string, unknown>,
	): void {
		console.log(
			JSON.stringify({
				level: 'error',
				timestamp: new Date().toISOString(),
				type: 'error',
				requestId: context.requestId,
				error: {
					name: error.name,
					message: error.message,
					stack: error.stack,
				},
				...additionalData,
			}),
		);
	}

	export function logEvent(
		context: LogContext,
		eventType: string,
		eventData: Record<string, unknown>,
	): void {
		console.log(
			JSON.stringify({
				level: 'info',
				timestamp: new Date().toISOString(),
				type: 'webhook_event',
				requestId: context.requestId,
				eventType,
				...eventData,
			}),
		);
	}

	export function loggingMiddleware() {
		return async (request: FastifyRequest, reply: FastifyReply) => {
			const context = StructuredLogger.createRequestContext(request);

			(request as any).logContext = context;

			StructuredLogger.logRequest(context, request);

			reply.raw.once('finish', () => {
				StructuredLogger.logResponse(context, reply);
			});
		};
	}
}

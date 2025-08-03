import type { FastifyReply, FastifyRequest } from 'fastify';
import { BaseError } from '../base/BaseError';
import type { ErrorHandlerConfig } from './types';

/**
 * Handler centralizado para tratamento de erros
 */
export class ErrorHandler {
	private config: ErrorHandlerConfig;
	private errorCounts: Map<string, number> = new Map();

	constructor(config: ErrorHandlerConfig) {
		this.config = config;
	}

	handleError(error: Error, context?: Record<string, unknown>): void {
		const isOperational = BaseError.isOperationalError(error);

		if (this.config.enableErrorMetrics) {
			const errorKey = error.constructor.name;
			this.errorCounts.set(errorKey, (this.errorCounts.get(errorKey) || 0) + 1);
		}

		this.logError(error, context, isOperational);

		if (!isOperational) {
			this.handleCriticalError(error, context);
		}
	}

	async handleFastifyError(
		error: Error,
		request: FastifyRequest,
		reply: FastifyReply,
	): Promise<void> {
		const context = {
			method: request.method,
			url: request.url,
			ip: request.ip,
			userAgent: request.headers['user-agent'],
			requestId: request.id,
		};

		this.handleError(error, context);

		const errorResponse = this.createErrorResponse(error);

		await reply.status(errorResponse.statusCode).send(errorResponse);
	}

	createErrorResponse(error: Error): {
		statusCode: number;
		error: string;
		message: string;
		details?: Record<string, unknown>;
		timestamp: string;
	} {
		if (error instanceof BaseError) {
			const response: {
				statusCode: number;
				error: string;
				message: string;
				details?: Record<string, unknown>;
				timestamp: string;
			} = {
				statusCode: error.statusCode,
				error: error.errorCode,
				message: error.message,
				timestamp: error.timestamp.toISOString(),
			};

			if (this.config.enableDetailedErrors && error.context) {
				response.details = error.context;
			}

			return response;
		}

		return {
			statusCode: 500,
			error: 'INTERNAL_SERVER_ERROR',
			message: this.config.enableDetailedErrors
				? error.message
				: 'Erro interno do servidor',
			timestamp: new Date().toISOString(),
		};
	}

	private logError(
		error: Error,
		context?: Record<string, unknown>,
		isOperational: boolean = true,
	): void {
		const mergedContext =
			error instanceof BaseError ? { ...error.context, ...context } : context;

		const baseLogData = error instanceof BaseError ? error.toLogFormat() : {};

		const logData = {
			name: error.name,
			message: error.message,
			stack: this.config.includeStackTrace ? error.stack : undefined,
			isOperational,
			...baseLogData,
			context: mergedContext,
		};

		const logLevel = this.determineLogLevel(error, isOperational);

		switch (logLevel) {
			case 'error':
				this.config.logger.error('Error occurred', logData);
				break;
			case 'warn':
				this.config.logger.warn('Warning occurred', logData);
				break;
			case 'info':
				this.config.logger.info('Info occurred', logData);
				break;
			case 'debug':
				this.config.logger.debug('Debug occurred', logData);
				break;
		}
	}

	private determineLogLevel(error: Error, isOperational: boolean): string {
		if (!isOperational) {
			return 'error';
		}

		if (error instanceof BaseError) {
			if (error.statusCode >= 500) return 'error';
			if (error.statusCode >= 400) return 'warn';
			return 'info';
		}

		return this.config.logLevel;
	}

	private handleCriticalError(
		error: Error,
		context?: Record<string, unknown>,
	): void {
		this.config.logger.error(
			'Critical error occurred - application may need to be restarted',
			{
				error: error.message,
				stack: error.stack,
				context,
				timestamp: new Date().toISOString(),
			},
		);

		process.exit(1);
	}

	getErrorMetrics(): Record<string, number> | null {
		if (!this.config.enableErrorMetrics) {
			return null;
		}

		return Object.fromEntries(this.errorCounts);
	}

	resetErrorMetrics(): void {
		this.errorCounts.clear();
	}

	isRecoverableError(error: Error): boolean {
		if (error instanceof BaseError) {
			return error.isOperational;
		}

		const recoverableErrors = [
			'ECONNRESET',
			'ECONNREFUSED',
			'ETIMEDOUT',
			'ENOTFOUND',
		];

		return recoverableErrors.some(
			(code) =>
				error.message.includes(code) ||
				(error as Error & { code?: string }).code === code,
		);
	}
}

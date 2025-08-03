import { BaseError } from '../base/BaseError';

/**
 * Erros relacionados às filas de eventos (RabbitMQ)
 */
export class QueueError extends BaseError {
	constructor(
		message: string,
		context?: Record<string, unknown>,
		statusCode: number = 500,
	) {
		super(message, 'QUEUE_ERROR', statusCode, true, context);
	}
}

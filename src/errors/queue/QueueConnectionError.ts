import { BaseError } from '../base/BaseError';

/**
 * Erro de conexão com RabbitMQ
 */
export class QueueConnectionError extends BaseError {
	constructor(
		message: string = 'Erro de conexão com fila',
		context?: Record<string, unknown>,
	) {
		super(message, 'QUEUE_CONNECTION_ERROR', 503, true, context);
	}
}

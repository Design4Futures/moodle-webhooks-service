import { BaseError } from '../base/BaseError';

/**
 * Erro para mensagem de fila com formato inválido
 */
export class QueueInvalidMessageError extends BaseError {
	constructor(
		message: string = 'Formato de mensagem da fila inválido',
		context?: Record<string, unknown>,
	) {
		super(message, 'QUEUE_INVALID_MESSAGE', 400, true, context);
	}
}

import { BaseError } from '../base/BaseError';

/**
 * Erro para fila não encontrada
 */
export class QueueNotFoundError extends BaseError {
	constructor(queueName: string, context?: Record<string, unknown>) {
		super(`Fila não encontrada: ${queueName}`, 'QUEUE_NOT_FOUND', 404, true, {
			...context,
			queueName,
		});
	}
}

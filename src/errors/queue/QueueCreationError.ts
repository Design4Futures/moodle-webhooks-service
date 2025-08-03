import { BaseError } from '../base/BaseError';

/**
 * Erro para falha na criação de fila
 */
export class QueueCreationError extends BaseError {
	constructor(
		queueName: string,
		originalError?: Error,
		context?: Record<string, unknown>,
	) {
		super(
			`Falha ao criar fila ${queueName}: ${originalError?.message || 'Erro desconhecido'}`,
			'QUEUE_CREATION_ERROR',
			500,
			true,
			{ ...context, queueName, originalError: originalError?.message },
		);
	}
}

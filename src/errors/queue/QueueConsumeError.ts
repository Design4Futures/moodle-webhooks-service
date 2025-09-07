import { BaseError } from '../base/BaseError';

/**
 * Erro para falha no consumo de mensagem da fila
 */
export class QueueConsumeError extends BaseError {
	constructor(
		queueName: string,
		originalError?: Error,
		context?: Record<string, unknown>,
	) {
		super(
			`Falha ao consumir mensagem da fila ${queueName}: ${originalError?.message || 'Erro desconhecido'}`,
			'QUEUE_CONSUME_ERROR',
			500,
			true,
			{ ...context, queueName, originalError: originalError?.message },
		);
	}
}

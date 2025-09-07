import { BaseError } from '../base/BaseError';

/**
 * Erro para falha na publicação de mensagem na fila
 */
export class QueuePublishError extends BaseError {
	constructor(
		queueName: string,
		originalError?: Error,
		context?: Record<string, unknown>,
	) {
		super(
			`Falha ao publicar mensagem na fila ${queueName}: ${originalError?.message || 'Erro desconhecido'}`,
			'QUEUE_PUBLISH_ERROR',
			500,
			true,
			{ ...context, queueName, originalError: originalError?.message },
		);
	}
}

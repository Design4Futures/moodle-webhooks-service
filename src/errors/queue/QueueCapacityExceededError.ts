import { BaseError } from '../base/BaseError';

/**
 * Erro para capacidade máxima da fila excedida
 */
export class QueueCapacityExceededError extends BaseError {
	constructor(
		queueName: string,
		currentSize: number,
		maxSize: number,
		context?: Record<string, unknown>,
	) {
		super(
			`Capacidade máxima da fila ${queueName} excedida: ${currentSize}/${maxSize}`,
			'QUEUE_CAPACITY_EXCEEDED',
			507,
			true,
			{ ...context, queueName, currentSize, maxSize },
		);
	}
}

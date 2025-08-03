import { BaseError } from '../base/BaseError';

/**
 * Erro para timeout na operação de fila
 */
export class QueueTimeoutError extends BaseError {
	constructor(
		operation: string,
		timeout: number,
		context?: Record<string, unknown>,
	) {
		super(
			`Timeout na operação de fila ${operation} após ${timeout}ms`,
			'QUEUE_TIMEOUT_ERROR',
			408,
			true,
			{ ...context, operation, timeout },
		);
	}
}

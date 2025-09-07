import { BaseError } from '../base/BaseError';

/**
 * Erros relacionados ao processamento de eventos
 */
export class EventError extends BaseError {
	constructor(
		message: string,
		context?: Record<string, unknown>,
		statusCode: number = 500,
	) {
		super(message, 'EVENT_ERROR', statusCode, true, context);
	}
}

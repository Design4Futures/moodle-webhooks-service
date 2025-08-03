import { BaseError } from '../base/BaseError';

/**
 * Erros relacionados ao processamento de eventos de webhook
 */
export class WebhookError extends BaseError {
	constructor(
		message: string,
		context?: Record<string, unknown>,
		statusCode: number = 500,
	) {
		super(message, 'WEBHOOK_ERROR', statusCode, true, context);
	}
}

import { BaseError } from '../base/BaseError';

/**
 * Erro para webhooks com formato inválido
 */
export class WebhookInvalidFormatError extends BaseError {
	constructor(
		message: string = 'Formato de webhook inválido',
		context?: Record<string, unknown>,
	) {
		super(message, 'WEBHOOK_INVALID_FORMAT', 400, true, context);
	}
}

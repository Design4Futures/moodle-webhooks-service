import { BaseError } from '../base/BaseError';

/**
 * Erro para token de webhook inválido ou ausente
 */
export class WebhookInvalidTokenError extends BaseError {
	constructor(
		message: string = 'Token de webhook inválido ou ausente',
		context?: Record<string, unknown>,
	) {
		super(message, 'WEBHOOK_INVALID_TOKEN', 401, true, context);
	}
}

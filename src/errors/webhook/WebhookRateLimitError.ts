import { BaseError } from '../base/BaseError';

/**
 * Erro para rate limiting de webhooks
 */
export class WebhookRateLimitError extends BaseError {
	constructor(
		message: string = 'Rate limit de webhooks excedido',
		context?: Record<string, unknown>,
	) {
		super(message, 'WEBHOOK_RATE_LIMIT', 429, true, context);
	}
}

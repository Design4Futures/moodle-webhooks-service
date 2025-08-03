import { BaseError } from '../base/BaseError';

/**
 * Erro para webhook duplicado (já processado)
 */
export class WebhookDuplicateError extends BaseError {
	constructor(webhookId: string, context?: Record<string, unknown>) {
		super(
			`Webhook duplicado detectado: ${webhookId}`,
			'WEBHOOK_DUPLICATE_ERROR',
			409,
			true,
			{ ...context, webhookId },
		);
	}
}

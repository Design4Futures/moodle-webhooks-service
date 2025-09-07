import { BaseError } from '../base/BaseError';

/**
 * Erro para falha no processamento de evento
 */
export class WebhookEventProcessingError extends BaseError {
	constructor(
		eventName: string,
		originalError?: Error,
		context?: Record<string, unknown>,
	) {
		super(
			`Falha no processamento do evento ${eventName}: ${originalError?.message || 'Erro desconhecido'}`,
			'WEBHOOK_EVENT_PROCESSING_ERROR',
			500,
			true,
			{ ...context, eventName, originalError: originalError?.message },
		);
	}
}

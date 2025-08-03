import { BaseError } from '../base/BaseError';

/**
 * Erro para eventos de webhook não suportados
 */
export class WebhookUnsupportedEventError extends BaseError {
	constructor(eventName: string, context?: Record<string, unknown>) {
		super(
			`Evento de webhook não suportado: ${eventName}`,
			'WEBHOOK_UNSUPPORTED_EVENT',
			400,
			true,
			{ ...context, eventName },
		);
	}
}

import { BaseError } from '../base/BaseError';

/**
 * Erro para timeout no processamento de webhook
 */
export class WebhookTimeoutError extends BaseError {
	constructor(timeout: number, context?: Record<string, unknown>) {
		super(
			`Timeout no processamento de webhook após ${timeout}ms`,
			'WEBHOOK_TIMEOUT_ERROR',
			408,
			true,
			{ ...context, timeout },
		);
	}
}

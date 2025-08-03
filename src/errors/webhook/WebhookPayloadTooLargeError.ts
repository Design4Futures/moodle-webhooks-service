import { BaseError } from '../base/BaseError';

/**
 * Erro para payload de webhook muito grande
 */
export class WebhookPayloadTooLargeError extends BaseError {
	constructor(
		size: number,
		maxSize: number,
		context?: Record<string, unknown>,
	) {
		super(
			`Payload do webhook muito grande: ${size} bytes (máximo: ${maxSize} bytes)`,
			'WEBHOOK_PAYLOAD_TOO_LARGE',
			413,
			true,
			{ ...context, size, maxSize },
		);
	}
}

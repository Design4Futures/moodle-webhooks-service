import { BaseError } from '../base/BaseError';

/**
 * Erro para rate limiting do Moodle
 */
export class MoodleRateLimitError extends BaseError {
	constructor(
		message: string = 'Rate limit excedido para API do Moodle',
		context?: Record<string, unknown>,
	) {
		super(message, 'MOODLE_RATE_LIMIT', 429, true, context);
	}
}

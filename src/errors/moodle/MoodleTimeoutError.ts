import { BaseError } from '../base/BaseError';

/**
 * Erro para timeout nas requisições para Moodle
 */
export class MoodleTimeoutError extends BaseError {
	constructor(timeout: number, context?: Record<string, unknown>) {
		super(
			`Timeout na requisição para Moodle após ${timeout}ms`,
			'MOODLE_TIMEOUT_ERROR',
			408,
			true,
			{ ...context, timeout },
		);
	}
}

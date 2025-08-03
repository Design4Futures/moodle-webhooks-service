import { BaseError } from '../base/BaseError';

/**
 * Erro para problemas de conectividade com Moodle
 */
export class MoodleConnectionError extends BaseError {
	constructor(
		message: string = 'Erro de conexão com Moodle',
		context?: Record<string, unknown>,
	) {
		super(message, 'MOODLE_CONNECTION_ERROR', 503, true, context);
	}
}

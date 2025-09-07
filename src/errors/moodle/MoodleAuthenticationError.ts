import { BaseError } from '../base/BaseError';

/**
 * Erro específico para falhas de autenticação com Moodle
 */
export class MoodleAuthenticationError extends BaseError {
	constructor(
		message: string = 'Falha na autenticação com Moodle',
		context?: Record<string, unknown>,
	) {
		super(message, 'MOODLE_AUTH_ERROR', 401, true, context);
	}
}

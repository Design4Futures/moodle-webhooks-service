import { BaseError } from '../base/BaseError';

/**
 * Erro para respostas inválidas da API do Moodle
 */
export class MoodleInvalidResponseError extends BaseError {
	constructor(
		message: string = 'Resposta inválida da API do Moodle',
		context?: Record<string, unknown>,
	) {
		super(message, 'MOODLE_INVALID_RESPONSE', 502, true, context);
	}
}

import { BaseError } from '../base/BaseError';

/**
 * Erros relacionados ao Moodle Client e integração com APIs do Moodle
 */
export class MoodleError extends BaseError {
	constructor(
		message: string,
		context?: Record<string, unknown>,
		statusCode: number = 500,
	) {
		super(message, 'MOODLE_ERROR', statusCode, true, context);
	}
}

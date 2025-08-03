import { BaseError } from '../base/BaseError';

/**
 * Erro para parâmetros inválidos enviados para Moodle
 */
export class MoodleInvalidParametersError extends BaseError {
	constructor(parameters: string[], context?: Record<string, unknown>) {
		super(
			`Parâmetros inválidos para API do Moodle: ${parameters.join(', ')}`,
			'MOODLE_INVALID_PARAMETERS',
			400,
			true,
			{ ...context, parameters },
		);
	}
}

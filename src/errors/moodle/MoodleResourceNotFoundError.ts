import { BaseError } from '../base/BaseError';

/**
 * Erro para quando um recurso não é encontrado no Moodle
 */
export class MoodleResourceNotFoundError extends BaseError {
	constructor(
		resource: string,
		id: string | number,
		context?: Record<string, unknown>,
	) {
		super(
			`Recurso ${resource} com ID ${id} não encontrado no Moodle`,
			'MOODLE_RESOURCE_NOT_FOUND',
			404,
			true,
			{ ...context, resource, id },
		);
	}
}

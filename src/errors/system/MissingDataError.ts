import { BaseError } from '../base/BaseError';

/**
 * Erro para dados obrigatórios ausentes
 */
export class MissingDataError extends BaseError {
	constructor(fields: string[], context?: Record<string, unknown>) {
		super(
			`Campos obrigatórios ausentes: ${fields.join(', ')}`,
			'MISSING_DATA',
			400,
			true,
			{ ...context, missingFields: fields },
		);
	}
}

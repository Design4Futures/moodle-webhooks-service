import { BaseError } from '../base/BaseError';

/**
 * Erro para dados com formato inválido
 */
export class InvalidDataFormatError extends BaseError {
	constructor(
		field: string,
		expectedFormat: string,
		actualValue?: unknown,
		context?: Record<string, unknown>,
	) {
		super(
			`Formato inválido para ${field}. Esperado: ${expectedFormat}`,
			'INVALID_DATA_FORMAT',
			400,
			true,
			{ ...context, field, expectedFormat, actualValue },
		);
	}
}

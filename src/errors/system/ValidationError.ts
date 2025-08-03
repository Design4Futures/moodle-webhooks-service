import { BaseError } from '../base/BaseError';

/**
 * Erros relacionados à validação de dados
 */
export class ValidationError extends BaseError {
	constructor(
		field: string,
		message: string,
		context?: Record<string, unknown>,
	) {
		super(
			`Erro de validação no campo ${field}: ${message}`,
			'VALIDATION_ERROR',
			400,
			true,
			{ ...context, field },
		);
	}
}

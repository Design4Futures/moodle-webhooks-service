import { ValidationError } from '../system/ValidationError';

/**
 * Função utilitária para criar um erro de validação
 */
export function createValidationError(
	field: string,
	message: string,
	context?: Record<string, unknown>,
): ValidationError {
	return new ValidationError(field, message, context);
}

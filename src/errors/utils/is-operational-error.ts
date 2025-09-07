import { BaseError } from '../base/BaseError';

/**
 * Função utilitária para verificar se um erro é operacional
 */
export function isOperationalError(error: Error): boolean {
	return BaseError.isOperationalError(error);
}

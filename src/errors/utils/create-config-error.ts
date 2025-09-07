import { ConfigurationError } from '../system/ConfigurationError';

/**
 * Função utilitária para criar erro de configuração
 */
export function createConfigError(
	message: string,
	context?: Record<string, unknown>,
): ConfigurationError {
	return new ConfigurationError(message, context);
}

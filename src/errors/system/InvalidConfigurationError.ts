import { BaseError } from '../base/BaseError';

/**
 * Erro para configuração ausente ou inválida
 */
export class InvalidConfigurationError extends BaseError {
	constructor(
		configKey: string,
		expectedType?: string,
		context?: Record<string, unknown>,
	) {
		const message = expectedType
			? `Configuração inválida para ${configKey}. Esperado: ${expectedType}`
			: `Configuração inválida ou ausente: ${configKey}`;

		super(message, 'INVALID_CONFIGURATION', 500, false, {
			...context,
			configKey,
			expectedType,
		});
	}
}

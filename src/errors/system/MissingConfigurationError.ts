import { BaseError } from '../base/BaseError';

/**
 * Erro para configuração obrigatória ausente
 */
export class MissingConfigurationError extends BaseError {
	constructor(configKeys: string[], context?: Record<string, unknown>) {
		super(
			`Configurações obrigatórias ausentes: ${configKeys.join(', ')}`,
			'MISSING_CONFIGURATION',
			500,
			false,
			{ ...context, missingKeys: configKeys },
		);
	}
}

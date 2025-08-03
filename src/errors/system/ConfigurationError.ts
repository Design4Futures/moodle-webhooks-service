import { BaseError } from '../base/BaseError';

/**
 * Erros relacionados à configuração do sistema
 */
export class ConfigurationError extends BaseError {
	constructor(message: string, context?: Record<string, unknown>) {
		super(message, 'CONFIGURATION_ERROR', 500, false, context);
	}
}

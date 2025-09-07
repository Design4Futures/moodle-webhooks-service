import { BaseError } from '../base/BaseError';

/**
 * Erros relacionados à rede e HTTP
 */
export class NetworkError extends BaseError {
	constructor(
		message: string,
		context?: Record<string, unknown>,
		statusCode: number = 500,
	) {
		super(message, 'NETWORK_ERROR', statusCode, true, context);
	}
}

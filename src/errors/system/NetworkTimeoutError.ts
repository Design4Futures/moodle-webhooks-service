import { BaseError } from '../base/BaseError';

/**
 * Erro para timeout de rede
 */
export class NetworkTimeoutError extends BaseError {
	constructor(url: string, timeout: number, context?: Record<string, unknown>) {
		super(
			`Timeout de rede para ${url} após ${timeout}ms`,
			'NETWORK_TIMEOUT',
			408,
			true,
			{ ...context, url, timeout },
		);
	}
}

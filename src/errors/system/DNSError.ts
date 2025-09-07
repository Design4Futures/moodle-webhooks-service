import { BaseError } from '../base/BaseError';

/**
 * Erro para falha de DNS
 */
export class DNSError extends BaseError {
	constructor(hostname: string, context?: Record<string, unknown>) {
		super(`Falha na resolução DNS para ${hostname}`, 'DNS_ERROR', 503, true, {
			...context,
			hostname,
		});
	}
}

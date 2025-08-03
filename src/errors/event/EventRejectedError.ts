import { BaseError } from '../base/BaseError';

/**
 * Erro para evento rejeitado por política de segurança
 */
export class EventRejectedError extends BaseError {
	constructor(
		eventType: string,
		reason: string,
		context?: Record<string, unknown>,
	) {
		super(
			`Evento ${eventType} rejeitado: ${reason}`,
			'EVENT_REJECTED',
			403,
			true,
			{ ...context, eventType, reason },
		);
	}
}

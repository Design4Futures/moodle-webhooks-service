import { BaseError } from '../base/BaseError';

/**
 * Erro para evento com formato inválido
 */
export class EventInvalidFormatError extends BaseError {
	constructor(
		eventType: string,
		missingFields?: string[],
		context?: Record<string, unknown>,
	) {
		const message = missingFields
			? `Formato inválido para evento ${eventType}. Campos ausentes: ${missingFields.join(', ')}`
			: `Formato inválido para evento ${eventType}`;

		super(message, 'EVENT_INVALID_FORMAT', 400, true, {
			...context,
			eventType,
			missingFields,
		});
	}
}

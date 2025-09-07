import { BaseError } from '../base/BaseError';

/**
 * Erro para falha na serialização/deserialização de evento
 */
export class EventSerializationError extends BaseError {
	constructor(
		operation: 'serialize' | 'deserialize',
		originalError?: Error,
		context?: Record<string, unknown>,
	) {
		super(
			`Falha na ${operation === 'serialize' ? 'serialização' : 'deserialização'} do evento: ${originalError?.message || 'Erro desconhecido'}`,
			'EVENT_SERIALIZATION_ERROR',
			500,
			true,
			{ ...context, operation, originalError: originalError?.message },
		);
	}
}

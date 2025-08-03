import { BaseError } from '../base/BaseError';

/**
 * Erro para handler de evento não encontrado
 */
export class EventHandlerNotFoundError extends BaseError {
	constructor(eventType: string, context?: Record<string, unknown>) {
		super(
			`Handler não encontrado para o evento: ${eventType}`,
			'EVENT_HANDLER_NOT_FOUND',
			404,
			true,
			{ ...context, eventType },
		);
	}
}

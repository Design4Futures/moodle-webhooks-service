import { BaseError } from '../base/BaseError';

/**
 * Erro para timeout na execução de handler de evento
 */
export class EventHandlerTimeoutError extends BaseError {
	constructor(
		eventType: string,
		handlerName: string,
		timeout: number,
		context?: Record<string, unknown>,
	) {
		super(
			`Timeout na execução do handler ${handlerName} para evento ${eventType} após ${timeout}ms`,
			'EVENT_HANDLER_TIMEOUT',
			408,
			true,
			{ ...context, eventType, handlerName, timeout },
		);
	}
}

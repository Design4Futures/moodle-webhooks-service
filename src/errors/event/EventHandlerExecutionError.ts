import { BaseError } from '../base/BaseError';

/**
 * Erro para falha na execução de handler de evento
 */
export class EventHandlerExecutionError extends BaseError {
	constructor(
		eventType: string,
		handlerName: string,
		originalError?: Error,
		context?: Record<string, unknown>,
	) {
		super(
			`Falha na execução do handler ${handlerName} para evento ${eventType}: ${originalError?.message || 'Erro desconhecido'}`,
			'EVENT_HANDLER_EXECUTION_ERROR',
			500,
			true,
			{
				...context,
				eventType,
				handlerName,
				originalError: originalError?.message,
			},
		);
	}
}

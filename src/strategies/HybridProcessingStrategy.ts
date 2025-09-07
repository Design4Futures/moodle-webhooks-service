import { QueueConnectionError } from '../errors';
import type {
	IEventHandlerMapper,
	IEventProcessingStrategy,
	IEventQueue,
} from '../interfaces/EventInterfaces';
import type { WebhookEvent, WebhookPayload } from '../types/webhook';
import { DirectProcessingStrategy } from './DirectProcessingStrategy';
import { QueueProcessingStrategy } from './QueueProcessingStrategy';

export class HybridProcessingStrategy implements IEventProcessingStrategy {
	private directStrategy: DirectProcessingStrategy;
	private queueStrategy: QueueProcessingStrategy | null;

	constructor(handlerMapper: IEventHandlerMapper, eventQueue?: IEventQueue) {
		this.directStrategy = new DirectProcessingStrategy(handlerMapper);
		this.queueStrategy = eventQueue
			? new QueueProcessingStrategy(eventQueue)
			: null;
	}

	async process(event: WebhookEvent, payload?: WebhookPayload): Promise<void> {
		//! Tentar fila primeiro, fallback para processamento direto
		if (this.queueStrategy?.shouldProcess(event)) {
			try {
				await this.queueStrategy.process(event, payload);
			} catch (error) {
				if (error instanceof QueueConnectionError) {
					await this.directStrategy.process(event, payload);
				} else {
					throw error;
				}
			}
		} else {
			await this.directStrategy.process(event, payload);
		}
	}

	shouldProcess(event: WebhookEvent): boolean {
		return (
			this.directStrategy.shouldProcess(event) ||
			this.queueStrategy?.shouldProcess(event) === true
		);
	}
}

import type { IEventProcessingStrategy } from '../interfaces/EventInterfaces';
import type { WebhookEvent, WebhookPayload } from '../types/webhook';

export class EventProcessingContext {
	private strategy: IEventProcessingStrategy;

	constructor(strategy: IEventProcessingStrategy) {
		this.strategy = strategy;
	}

	setStrategy(strategy: IEventProcessingStrategy): void {
		this.strategy = strategy;
	}

	async processEvent(
		event: WebhookEvent,
		payload?: WebhookPayload,
	): Promise<void> {
		if (this.strategy.shouldProcess(event)) {
			await this.strategy.process(event, payload);
		} else {
			console.log(
				`Evento ${event.eventname} ignorado - nenhuma estratégia de processamento adequada`,
			);
		}
	}

	canProcess(event: WebhookEvent): boolean {
		return this.strategy.shouldProcess(event);
	}
}

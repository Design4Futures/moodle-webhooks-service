import type {
	IEventProcessingStrategy,
	IEventQueue,
} from '../interfaces/EventInterfaces';
import type { WebhookEvent, WebhookPayload } from '../types/webhook';

export class QueueProcessingStrategy implements IEventProcessingStrategy {
	private eventQueue: IEventQueue;

	constructor(eventQueue: IEventQueue) {
		this.eventQueue = eventQueue;
	}

	async process(event: WebhookEvent, _payload?: WebhookPayload): Promise<void> {
		if (this.eventQueue?.isConnected) {
			await this.eventQueue.publishEvent(event);
			console.log(
				`Evento ${event.eventname} enviado para fila de processamento`,
			);
		} else {
			throw new Error('Fila de eventos não está disponível ou não conectada');
		}
	}

	shouldProcess(event: WebhookEvent): boolean {
		return (
			this.eventQueue?.isConnected &&
			this.eventQueue?.isEventSupported(event.eventname)
		);
	}
}

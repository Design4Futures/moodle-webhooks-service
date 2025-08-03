import { QueueConnectionError } from '../errors';
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
			throw new QueueConnectionError(
				'Fila de eventos não está disponível ou não conectada',
				{
					eventname: event.eventname,
					isConnected: this.eventQueue?.isConnected,
					isEventSupported: this.eventQueue?.isEventSupported(event.eventname),
				},
			);
		}
	}

	shouldProcess(event: WebhookEvent): boolean {
		return (
			this.eventQueue?.isConnected &&
			this.eventQueue?.isEventSupported(event.eventname)
		);
	}
}

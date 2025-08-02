import type {
	IEventHandler,
	IEventProcessingStrategy,
} from '../interfaces/EventInterfaces';
import type { WebhookEvent, WebhookPayload } from '../types/webhook';

export class DirectProcessingStrategy implements IEventProcessingStrategy {
	private handlerMapper: Map<string, IEventHandler>;

	constructor(handlerMapper: Map<string, IEventHandler>) {
		this.handlerMapper = handlerMapper;
	}

	async process(event: WebhookEvent, payload?: WebhookPayload): Promise<void> {
		const handler = this.handlerMapper.get(event.eventname);
		if (handler && payload) {
			await handler(event, payload);
			console.log(`Evento ${event.eventname} processado diretamente`);
		} else if (handler) {
			//! Criar payload mínimo se nenhum for fornecido
			const minimalPayload: WebhookPayload = {
				token: event.token,
				events: [event],
				site: {
					id: '1',
					url: `http://${event.host || 'localhost'}`,
					name: 'Moodle Site',
					version: '4.0',
				},
			};
			await handler(event, minimalPayload);
			console.log(
				`Evento ${event.eventname} processado diretamente com payload mínimo`,
			);
		} else {
			console.log(`Nenhum handler encontrado para evento: ${event.eventname}`);
		}
	}

	shouldProcess(event: WebhookEvent): boolean {
		return this.handlerMapper.has(event.eventname);
	}
}

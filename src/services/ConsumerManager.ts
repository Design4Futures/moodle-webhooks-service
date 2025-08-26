import type { EventHandlerMapper } from '../config/EventHandlerMapper';
import type { WebhookEvent, WebhookPayload } from '../types/webhook';
import { RedisEventTracker } from './RedisEventTracker';
import type { WebhookEventQueue } from './WebhookEventQueue';

export interface EventMessage extends WebhookEvent {
	publishedAt?: string;
	messageId?: string;
	originalPayload?: WebhookPayload;
	headers?: Record<string, unknown>;
}

/**
 * Centraliza o registro de consumers e a lógica de marcação de eventos
 * (markAsProcessed / markAsFailed) para manter o WebhookManager limpo.
 */
export async function startConsumers(
	eventQueue: WebhookEventQueue,
	handlerMapper: EventHandlerMapper,
	eventTracker: RedisEventTracker,
): Promise<void> {
	if (!eventQueue?.isConnected) return;

	const supportedEvents = handlerMapper.getSupportedEvents();

	for (const eventName of supportedEvents) {
		const handler = handlerMapper.getHandler(eventName);
		if (!handler) {
			console.warn(`No handler found for event: ${eventName}`);
			continue;
		}

		await eventQueue.consumeEvents(
			eventName,
			async (rawMessage: EventMessage) => {
				const eventId = RedisEventTracker.generateEventId(rawMessage) || '';
				const start = Date.now();
				try {
					const payloadToUse: WebhookPayload =
						rawMessage.originalPayload ||
						({
							token: rawMessage.token || 'test-token',
							events: [rawMessage],
							site: {
								id: '1',
								url: `http://${rawMessage.host}`,
								name: 'Moodle Site',
								version: '4.0',
							},
						} as WebhookPayload);

					await handler(rawMessage, payloadToUse);

					await eventTracker.markAsProcessed(eventId, {
						processedAt: new Date(),
						processingTimeMs: Date.now() - start,
						strategy: 'queue',
						eventType: rawMessage.eventname,
						userId: rawMessage.userid,
					});
				} catch (error) {
					await eventTracker.markAsFailed(
						eventId,
						error instanceof Error
							? error
							: new Error('Unknown consumer error'),
					);
					throw error;
				}
			},
		);
	}
}

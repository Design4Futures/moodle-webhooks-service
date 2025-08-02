import { EventRegistry } from '../config/EventRegistry';
import type { IEventQueue } from '../interfaces/EventInterfaces';
import type { WebhookEvent } from '../types/webhook';
import { type RabbitMQConfig, RabbitMQService } from './RabbitMQService';

export interface EventMessage extends WebhookEvent {
	publishedAt: string;
	messageId: string;
	headers?: {
		eventType: string;
		component: string;
		retryCount: number;
		maxRetries: number;
		originalMessageId?: string;
	};
}

export class WebhookEventQueue implements IEventQueue {
	private rabbitmq: RabbitMQService;
	private eventRegistry: EventRegistry;

	constructor(config: RabbitMQConfig) {
		this.rabbitmq = new RabbitMQService(config);
		this.eventRegistry = EventRegistry.getInstance();
	}

	async initialize(): Promise<void> {
		await this.rabbitmq.connect();
		await this.createQueues();
	}

	async shutdown(): Promise<void> {
		await this.rabbitmq.disconnect();
	}

	private async createQueues(): Promise<void> {
		const events = this.eventRegistry.getAllEvents();

		for (const config of events) {
			if (config.eventName === 'default') continue;

			await this.rabbitmq.createQueue(config.queueName, config.routingKey, {
				durable: true,
				...(config.ttl && { messageTtl: config.ttl }),
			});

			//! Create retry queue for failed events
			await this.rabbitmq.createQueue(
				`${config.queueName}.retry`,
				`${config.routingKey}.retry`,
				{
					durable: true,
					...(config.ttl && { messageTtl: config.ttl * 2 }),
				},
			);
		}

		//* Create default queue
		const defaultConfig = this.eventRegistry.getDefaultEventConfig();
		await this.rabbitmq.createQueue(
			defaultConfig.queueName,
			defaultConfig.routingKey,
			{
				durable: true,
				...(defaultConfig.ttl && { messageTtl: defaultConfig.ttl }),
			},
		);
	}

	async publishEvent(event: WebhookEvent): Promise<void> {
		const config =
			this.eventRegistry.getEventConfig(event.eventname) ||
			this.eventRegistry.getDefaultEventConfig();

		const messageOptions: Record<string, unknown> = {
			headers: {
				eventType: event.eventname,
				component: event.component,
				retryCount: 0,
				maxRetries: config.retries || 2,
			},
		};

		if (config.priority !== undefined) {
			messageOptions.priority = config.priority;
		}

		await this.rabbitmq.publishEvent(event, config.routingKey, messageOptions);

		console.log(`Event ${event.eventname} sent to queue ${config.queueName}`);
	}

	async retryFailedEvent(
		event: EventMessage,
		retryCount: number,
	): Promise<void> {
		const config =
			this.eventRegistry.getEventConfig(event.eventname) ||
			this.eventRegistry.getDefaultEventConfig();

		if (retryCount >= (config.retries || 2)) {
			console.error(
				`Event ${event.eventname} exceeded maximum retry attempts (${config.retries})`,
			);
			return;
		}

		const retryDelay = 2 ** retryCount * 1000;

		const messageOptions: Record<string, unknown> = {
			expiration: retryDelay.toString(),
			headers: {
				eventType: event.eventname,
				component: event.component,
				retryCount: retryCount + 1,
				maxRetries: config.retries,
				originalMessageId: event.messageId,
			},
		};

		if (config.priority !== undefined) {
			messageOptions.priority = Math.max(1, config.priority - retryCount);
		}

		await this.rabbitmq.publishEvent(
			event,
			`${config.routingKey}.retry`,
			messageOptions,
		);

		console.log(
			`Event ${event.eventname} rescheduled for retry (attempt ${retryCount + 1}/${config.retries})`,
		);
	}

	async consumeEvents<T extends WebhookEvent>(
		eventType: string,
		handler: (
			event: T & { publishedAt: string; messageId: string },
		) => Promise<void>,
	): Promise<void> {
		const config = this.eventRegistry.getEventConfig(eventType);
		if (!config) {
			throw new Error(`Configuration not found for event: ${eventType}`);
		}

		await this.rabbitmq.consumeQueue(
			config.queueName,
			async (message) => {
				const eventMessage = message as EventMessage;
				const retryCount = eventMessage.headers?.retryCount || 0;

				try {
					await handler(
						eventMessage as T & { publishedAt: string; messageId: string },
					);
					console.log(`Event ${eventType} processed successfully`);
				} catch (error) {
					console.error(`Error processing event ${eventType}:`, error);

					if (retryCount < (config.retries || 2)) {
						await this.retryFailedEvent(eventMessage, retryCount);
					} else {
						console.error(
							`Event ${eventType} failed permanently after ${retryCount} attempts`,
						);
					}

					throw error;
				}
			},
			{
				prefetch: 10,
			},
		);
	}

	async getQueueStats(): Promise<
		Record<string, { messageCount: number; consumerCount: number }>
	> {
		const stats: Record<
			string,
			{ messageCount: number; consumerCount: number }
		> = {};

		const events = this.eventRegistry.getAllEvents();
		for (const config of events) {
			if (config.eventName === 'default') continue;

			try {
				stats[config.eventName] = await this.rabbitmq.getQueueInfo(
					config.queueName,
				);
			} catch (error) {
				console.error(
					`Error getting queue stats for ${config.queueName}:`,
					error,
				);
			}
		}

		return stats;
	}

	get isConnected(): boolean {
		return this.rabbitmq.connected;
	}

	isEventSupported(eventName: string): boolean {
		return this.eventRegistry.getEventConfig(eventName) !== undefined;
	}
}

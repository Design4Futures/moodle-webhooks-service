import dotenv from 'dotenv';
import { EventHandlerMapper } from '../config/EventHandlerMapper';
import { EventRegistry } from '../config/EventRegistry';
import { MissingConfigurationError } from '../errors';
import { MoodleEventHandlers } from '../handlers/MoodleEventHandler';
import { MoodleClient } from '../lib/MoodleClient';
import { WebhookEventQueue } from '../services/WebhookEventQueue';

dotenv.config();

class EventConsumer {
	private eventQueue: WebhookEventQueue;
	private handlers: MoodleEventHandlers;
	private eventRegistry: EventRegistry;
	private handlerMapper: EventHandlerMapper;

	constructor() {
		if (!process.env.RABBITMQ_URL || !process.env.RABBITMQ_EXCHANGE) {
			throw new MissingConfigurationError(
				['RABBITMQ_URL', 'RABBITMQ_EXCHANGE'],
				{
					component: 'EventConsumer',
					reason: 'RabbitMQ configuration is required for the consumer',
				},
			);
		}

		if (!process.env.MOODLE_BASE_URL || !process.env.MOODLE_TOKEN) {
			throw new MissingConfigurationError(['MOODLE_BASE_URL', 'MOODLE_TOKEN'], {
				component: 'EventConsumer',
				reason: 'Moodle configuration is required for the consumer',
			});
		}

		this.eventQueue = new WebhookEventQueue({
			url: process.env.RABBITMQ_URL,
			exchangeName: process.env.RABBITMQ_EXCHANGE,
			retryAttempts: Number.parseInt(
				process.env.RABBITMQ_RETRY_ATTEMPTS || '3',
			),
			retryDelay: Number.parseInt(process.env.RABBITMQ_RETRY_DELAY || '5000'),
		});

		const moodleClient = new MoodleClient({
			baseUrl: process.env.MOODLE_BASE_URL,
			token: process.env.MOODLE_TOKEN,
		});

		this.handlers = new MoodleEventHandlers(moodleClient);
		this.eventRegistry = EventRegistry.getInstance();
		this.handlerMapper = new EventHandlerMapper(this.handlers);
	}

	async start(): Promise<void> {
		console.log('Starting event consumer...');

		await this.eventQueue.initialize();

		const enabledEvents = this.eventRegistry.getEnabledEvents();

		for (const eventName of enabledEvents) {
			if (this.handlerMapper.hasHandler(eventName)) {
				const handler = this.handlerMapper.getHandler(eventName);
				if (handler) {
					await this.eventQueue.consumeEvents(eventName, async (event) => {
						const mockPayload = {
							token: event.token,
							events: [event],
							site: {
								id: '1',
								url: `http://${event.host}`,
								name: 'Moodle Site',
								version: '4.0',
							},
						};
						await handler(event, mockPayload);
					});

					console.log(`Consumer configured for: ${eventName}`);
				}
			} else {
				console.warn(`No handler found for event: ${eventName}`);
			}
		}

		console.log('Consumer started and listening for events...');

		setInterval(async () => {
			try {
				const stats = await this.eventQueue.getQueueStats();
				console.log('Queue statistics:', stats);
			} catch (error) {
				console.error('Error getting statistics:', error);
			}
		}, 30000);
	}

	async stop(): Promise<void> {
		console.log('Stopping consumer...');
		await this.eventQueue.shutdown();
		console.log('Consumer stopped');
	}
}

const main = async () => {
	const consumer = new EventConsumer();

	const gracefulShutdown = async (signal: string) => {
		console.log(`Received ${signal}, stopping consumer...`);
		try {
			await consumer.stop();
			process.exit(0);
		} catch (error) {
			console.error('Error stopping consumer:', error);
			process.exit(1);
		}
	};

	process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
	process.on('SIGINT', () => gracefulShutdown('SIGINT'));

	try {
		await consumer.start();
	} catch (error) {
		console.error('Error starting consumer:', error);
		process.exit(1);
	}
};

if (require.main === module) {
	main();
}

export { EventConsumer };

/** biome-ignore-all lint/style/noNonNullAssertion: <any> */

import dotenv from 'dotenv';
import { ConfigManager } from '../config/ConfigManager';
import { EventHandlerMapper } from '../config/EventHandlerMapper';
import { EventRegistry } from '../config/EventRegistry';
import { type ErrorHandler, initializeErrorHandling } from '../errors';
import { MoodleEventHandlers } from '../handlers/MoodleEventHandler';
import { MoodleClient } from '../lib/MoodleClient';
import { WebhookEventQueue } from '../services/WebhookEventQueue';
import type { EventProcessingContext } from '../strategies/EventProcessingStrategy';
import {
	createProcessingStrategy,
	getRecommendedProcessingMode,
} from '../strategies/EventProcessingStrategyFactory';
import type { EventHandler } from '../types/eventhandler';
import type {
	WebhookConfig,
	WebhookEvent,
	WebhookPayload,
} from '../types/webhook';
import { MoodleWebhookServer } from './MoodleWebhookServer';

class WebhookManager {
	private server: MoodleWebhookServer;
	private handlers: MoodleEventHandlers;
	private eventQueue: WebhookEventQueue | undefined;
	private handlerMapper: EventHandlerMapper;
	private eventRegistry: EventRegistry;
	private processingContext!: EventProcessingContext;
	private configManager: ConfigManager;
	private errorHandler: ErrorHandler;

	constructor(moodleClient?: MoodleClient, eventQueue?: WebhookEventQueue) {
		this.configManager = ConfigManager.getInstance();
		const config = this.configManager.getConfig();
		this.errorHandler = initializeErrorHandling();

		//! Criar configuração do webhook a partir do ConfigManager
		const webhookConfig: WebhookConfig = {
			host: config.server.host,
			port: config.server.port,
			path: process.env.WEBHOOK_PATH || '/webhook',
			secret: process.env.MOODLE_TOKEN || 'default-secret',
			moodleUrl: config.moodle.baseUrl,
			enabledEvents: EventRegistry.getInstance().getEnabledEvents(),
			rateLimiting: {
				max: config.server.rateLimit.max,
				timeWindow: config.server.rateLimit.windowMs,
			},
		};

		this.eventQueue = eventQueue;
		this.server = new MoodleWebhookServer(webhookConfig, eventQueue);

		const moodleClientInstance =
			moodleClient || new MoodleClient(config.moodle);
		this.handlers = new MoodleEventHandlers(moodleClientInstance);

		this.handlerMapper = new EventHandlerMapper(this.handlers);
		this.eventRegistry = EventRegistry.getInstance();

		this.setupProcessingStrategy();
		this.setupEventHandlers();
		this.setupEventConsumers();
	}

	public getErrorHandler(): ErrorHandler {
		return this.errorHandler;
	}

	private setupProcessingStrategy(): void {
		//! Criar mapa de handlers para estratégias
		const handlerMap = new Map();
		this.handlerMapper.getAllHandlers().forEach(({ eventName, handler }) => {
			handlerMap.set(eventName, handler);
		});

		//! Usar factory para criar a estratégia recomendada
		const mode = getRecommendedProcessingMode(
			!!this.eventQueue,
			this.eventQueue?.isConnected || false,
		);
		this.processingContext = createProcessingStrategy(
			mode,
			handlerMap,
			this.eventQueue,
		);
	}

	private setupEventHandlers(): void {
		const enabledEvents = this.eventRegistry.getEnabledEvents();

		for (const eventName of enabledEvents) {
			if (this.handlerMapper.hasHandler(eventName)) {
				this.server.on(
					eventName,
					async (event: WebhookEvent, payload: WebhookPayload) => {
						await this.processingContext.processEvent(event, payload);
					},
				);
			}
		}

		this.server.onAny(async (event, payload) => {
			console.log(`Event received: ${event.eventname} - User: ${event.userid}`);
			await this.saveEventForAnalytics(event, payload);
		});
	}

	private async setupEventConsumers(): Promise<void> {
		if (!this.eventQueue?.isConnected) {
			console.log('RabbitMQ is not connected, skipping consumers setup');
			return;
		}

		//! Configurar consumers para processar eventos das filas
		const supportedEvents = this.handlerMapper.getSupportedEvents();

		for (const eventName of supportedEvents) {
			const handler = this.handlerMapper.getHandler(eventName);
			if (handler) {
				await this.eventQueue.consumeEvents(eventName, async (event) => {
					await handler(event, this.createMockPayload(event));
				});
			}
		}
	}

	private createMockPayload(event: WebhookEvent): WebhookPayload {
		return {
			token: event.token || 'test-token',
			events: [event],
			site: {
				id: '1',
				url: 'https://test-moodle.com',
				name: 'Test Moodle',
				version: '4.0',
			},
		};
	}

	private async saveEventForAnalytics(
		_event: unknown,
		_payload: unknown,
	): Promise<void> {
		console.log('Event saved for analytics');
	}

	async start(): Promise<void> {
		const configManager = ConfigManager.getInstance();
		const config = configManager.getConfig();

		if (this.eventQueue) {
			console.log('Initializing RabbitMQ...');
			await this.eventQueue.initialize();
			console.log('RabbitMQ connected and queues created');
		}

		await this.server.start();
		console.log(
			`Webhook server started at http://${config.server.host}:${config.server.port}`,
		);

		//* Registrar configuração
		console.log('Webhook Manager started successfully');
		console.log(`Processing mode: ${config.processing.mode}`);
		console.log(
			`RabbitMQ integration: ${this.eventQueue ? 'enabled' : 'disabled'}`,
		);
		console.log(
			`Queue processing: ${configManager.isQueueEnabled() ? 'enabled' : 'disabled'}`,
		);

		//! Mostrar eventos habilitados
		const enabledEvents = this.eventRegistry.getEnabledEvents();
		console.log(`Enabled events (${enabledEvents.length}):`, enabledEvents);

		if (this.eventQueue) {
			console.log('Event handlers registered for RabbitMQ consumers');
		} else {
			console.log('Events will be processed directly without queue');
		}
	}

	async stop(): Promise<void> {
		console.log('Stopping Webhook Manager...');

		await this.server.stop();
		console.log('Webhook server stopped');

		if (this.eventQueue) {
			await this.eventQueue.shutdown();
			console.log('RabbitMQ connection closed');
		}

		console.log('Webhook Manager stopped successfully');
	}

	//! Endpoint de teste do webhook para testes manuais
	async triggerTestEvent(eventType: string): Promise<void> {
		const testEvent: WebhookEvent = {
			eventname: eventType,
			component: 'core',
			action: 'test',
			target: 'test_user',
			objecttable: 'user',
			objectid: 999,
			crud: 'c',
			edulevel: 2,
			contextid: 1,
			contextlevel: 10,
			contextinstanceid: 0,
			userid: 999,
			courseid: 1,
			anonymous: 0,
			other: {},
			timecreated: Math.floor(Date.now() / 1000),
			host: '127.0.0.1',
			token: 'test-token',
			extra: 'test',
		};

		if (this.eventQueue) {
			await this.eventQueue.publishEvent(testEvent);
			console.log(`Test event ${eventType} published to RabbitMQ`);
		} else {
			const payload = this.createMockPayload(testEvent);
			const handler = this.handlerMapper.getHandler(eventType);
			if (handler) {
				await handler(testEvent, payload);
				console.log(`Test event ${eventType} processed locally`);
			} else {
				console.log(`No handler found for event ${eventType}`);
			}
		}
	}

	//* Obter estatísticas do webhook
	async getStats(): Promise<{
		serverStats: { uptime: number; timestamp: number };
		queueStats?: Record<
			string,
			{ messageCount: number; consumerCount: number }
		>;
	}> {
		const serverStats = {
			uptime: Date.now() - Date.now(),
			timestamp: Date.now(),
		};

		if (this.eventQueue) {
			const queueStats = await this.eventQueue.getQueueStats();
			return { serverStats, queueStats };
		}

		return { serverStats };
	}

	on(eventName: string, handler: EventHandler): void {
		this.server.on(eventName, handler);
	}

	onAny(handler: (event: WebhookEvent, payload: WebhookPayload) => void): void {
		this.server.onAny(handler);
	}
}

export { WebhookManager };

async function createWebhookManager(): Promise<WebhookManager> {
	dotenv.config();

	//! Obter configuração centralizada
	const configManager = ConfigManager.getInstance();

	console.log('Initializing webhook system with configuration:');
	console.log(
		`- Processing Mode: ${configManager.getConfig().processing.mode}`,
	);
	console.log(`- Queue Enabled: ${configManager.isQueueEnabled()}`);
	console.log(
		`- Server: ${configManager.getConfig().server.host}:${configManager.getConfig().server.port}`,
	);

	//! Criar fila de eventos RabbitMQ se habilitada
	let eventQueue: WebhookEventQueue | undefined;
	if (configManager.isQueueEnabled()) {
		eventQueue = new WebhookEventQueue(configManager.getRabbitMQConfig());
	}

	//! Criar cliente Moodle
	const moodleClient = new MoodleClient(configManager.getMoodleConfig());

	//! Criar e retornar WebhookManager
	return new WebhookManager(moodleClient, eventQueue);
}

if (require.main === module) {
	async function main() {
		try {
			console.log('Starting Webhook System...');

			const manager = await createWebhookManager();

			//! Configurar desligamento graceful
			const shutdown = async (signal: string) => {
				console.log(`Received ${signal}, shutting down gracefully...`);
				try {
					await manager.stop();
					process.exit(0);
				} catch (error) {
					manager
						.getErrorHandler()
						.handleError(
							error instanceof Error ? error : new Error('Shutdown error'),
							{ signal, component: 'WebhookManager', operation: 'shutdown' },
						);
					process.exit(1);
				}
			};

			process.on('SIGTERM', () => shutdown('SIGTERM'));
			process.on('SIGINT', () => shutdown('SIGINT'));

			//! Iniciar o webhook manager
			await manager.start();

			console.log('Webhook system started successfully!');
		} catch (error) {
			const manager = new WebhookManager();
			manager
				.getErrorHandler()
				.handleError(
					error instanceof Error
						? error
						: new Error('Failed to start webhook system'),
					{ component: 'WebhookManager', operation: 'main' },
				);
			process.exit(1);
		}
	}

	main();
}

export { createWebhookManager };

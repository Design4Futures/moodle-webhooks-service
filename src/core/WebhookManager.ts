/** biome-ignore-all lint/style/noNonNullAssertion: <any> */

import dotenv from 'dotenv';
import { ConfigManager } from '../config/ConfigManager';
import { EventHandlerMapper } from '../config/EventHandlerMapper';
import { EventRegistry } from '../config/EventRegistry';
import { type ErrorHandler, initializeErrorHandling } from '../errors';
import { MoodleEventHandlers } from '../handlers/MoodleEventHandler';
import type { HealthStatus, SystemHealth } from '../interfaces/IHealthCheck';
import { MoodleClient } from '../lib/MoodleClient';
import { ServiceClient } from '../lib/ServiceClient';
import { AlertService } from '../services/Alert';
import { startConsumers } from '../services/ConsumerManager';
import { HealthCheckService } from '../services/HealthCheck';
import { MemoryHealthCheck } from '../services/MemoryHealthCheck';
import { MetricsCollector } from '../services/MetricsCollector';
import { MoodleHealthCheck } from '../services/MoodleHealthCheck';
import { RabbitMQHealthCheck } from '../services/RabbitMQHealthCheck';
import { RedisEventTracker } from '../services/RedisEventTracker';
import { RedisHealthCheck } from '../services/RedisHealthCheck';
import { WebhookEventQueue } from '../services/WebhookEventQueue';
import type { EventProcessingContext } from '../strategies/EventProcessingStrategy';
import {
	createProcessingStrategy,
	getRecommendedProcessingMode,
} from '../strategies/EventProcessingStrategyFactory';
import type { WebhookEvent, WebhookPayload } from '../types/webhook';
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
	private metricsCollector: MetricsCollector;
	private healthCheckService: HealthCheckService;
	private eventTracker: RedisEventTracker;
	private alertService: AlertService;

	constructor(moodleClient?: MoodleClient, eventQueue?: WebhookEventQueue) {
		this.configManager = ConfigManager.getInstance();
		const config = this.configManager.getConfig();
		this.errorHandler = initializeErrorHandling();

		this.metricsCollector = new MetricsCollector();
		this.healthCheckService = new HealthCheckService();

		const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
		this.eventTracker = new RedisEventTracker(redisUrl);

		this.eventQueue = eventQueue;

		const moodleClientInstance =
			moodleClient || new MoodleClient(config.moodle);
		const serviceClientInstance = new ServiceClient(config);

		this.handlers = new MoodleEventHandlers(
			moodleClientInstance,
			serviceClientInstance,
		);

		this.handlerMapper = new EventHandlerMapper(this.handlers);
		this.eventRegistry = EventRegistry.getInstance();

		this.server = new MoodleWebhookServer(
			config,
			eventQueue,
			this.eventTracker,
			this.metricsCollector,
		);

		this.alertService = new AlertService();

		//! Configurar verificação periódica de alertas
		this.setupAlertMonitoring();

		this.setupHealthChecks(moodleClientInstance);
	}

	public getErrorHandler(): ErrorHandler {
		return this.errorHandler;
	}

	private setupProcessingStrategy(): void {
		//! Usar factory para criar a estratégia recomendada
		const mode = getRecommendedProcessingMode(
			!!this.eventQueue,
			this.eventQueue?.isConnected || false,
		);
		this.processingContext = createProcessingStrategy(
			mode,
			this.handlerMapper,
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

	private setupAlertMonitoring(): void {
		setInterval(
			async () => {
				try {
					const metrics = this.getMetrics();
					const health = await this.getSystemHealth();

					const newAlerts = this.alertService.checkAlerts(metrics, health);

					if (newAlerts.length > 0) {
						console.log(`🚨 Generated ${newAlerts.length} new alerts`);
					}
				} catch (error) {
					console.error('Error during alert monitoring:', error);
				}
			},
			2 * 60 * 1000,
		); // 2 minutos
	}

	private async saveEventForAnalytics(
		_event: unknown,
		_payload: unknown,
	): Promise<void> {
		console.log('Event saved for analytics');
	}

	private setupHealthChecks(moodleClient: MoodleClient): void {
		this.healthCheckService = new HealthCheckService();

		// Adicionar health checks
		this.healthCheckService.addHealthCheck(new MoodleHealthCheck(moodleClient));
		this.healthCheckService.addHealthCheck(
			new RedisHealthCheck(this.eventTracker),
		);
		this.healthCheckService.addHealthCheck(new MemoryHealthCheck(512)); // 512MB limit

		if (this.eventQueue) {
			this.healthCheckService.addHealthCheck(
				new RabbitMQHealthCheck(this.eventQueue),
			);
		}
	}

	async start(): Promise<void> {
		try {
			console.log('🚀 Starting Webhook Manager...');

			// Inicializar event tracker
			console.log('📊 Connecting to Redis...');
			// O RedisEventTracker conecta automaticamente quando usado

			// Inicializar fila de eventos se configurada
			if (this.eventQueue) {
				console.log('🐰 Connecting to RabbitMQ...');
				await this.eventQueue.initialize();
			}

			// Iniciar servidor
			console.log('🌐 Starting webhook server...');
			await this.server.start();

			// Now that the server and optional queue are initialized, set up
			// processing strategy, register handlers and start consumers.
			this.setupProcessingStrategy();
			this.setupEventHandlers();
			if (this.eventQueue) {
				await startConsumers(
					this.eventQueue,
					this.handlerMapper,
					this.eventTracker,
				);
			}

			// Verificar health inicial
			console.log('🏥 Checking system health...');
			const health = await this.healthCheckService.checkAll();
			console.log('Health status:', health.status);

			if (health.status === 'DOWN') {
				console.warn('⚠️  System started with degraded health:', health);
			}

			// Configurar limpeza periódica
			this.setupPeriodicCleanup();

			console.log('✅ Webhook Manager started successfully!');
		} catch (error) {
			console.error('❌ Failed to start Webhook Manager:', error);
			throw error;
		}
	}

	async stop(): Promise<void> {
		console.log('🛑 Stopping Webhook Manager...');

		try {
			await this.server.stop();
			console.log('✅ Webhook server stopped');

			if (this.eventQueue) {
				await this.eventQueue.shutdown();
				console.log('✅ RabbitMQ connection closed');
			}

			await this.eventTracker.disconnect();
			console.log('✅ Redis connection closed');

			console.log('✅ Webhook Manager stopped successfully');
		} catch (error) {
			console.error('❌ Error during shutdown:', error);
			throw error;
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

	onAny(handler: (event: WebhookEvent, payload: WebhookPayload) => void): void {
		this.server.onAny(handler);
	}

	private setupPeriodicCleanup(): void {
		// Limpeza de eventos antigos a cada hora
		setInterval(
			async () => {
				try {
					const oneDay = 24 * 60 * 60 * 1000; // 24 horas em ms
					const cleaned = await this.eventTracker.cleanupOldEntries(oneDay);
					if (cleaned > 0) {
						console.log(`🧹 Cleaned up ${cleaned} old event entries`);
					}
				} catch (error) {
					console.error('Error during periodic cleanup:', error);
				}
			},
			60 * 60 * 1000,
		); // A cada hora

		// Reset de métricas a cada dia
		setInterval(
			() => {
				console.log('📊 Resetting daily metrics...');
				this.metricsCollector.reset();
			},
			24 * 60 * 60 * 1000,
		); // A cada 24 horas
	}

	async getSystemHealth(): Promise<SystemHealth> {
		return this.healthCheckService.checkAll();
	}

	async getComponentHealth(
		componentName: string,
	): Promise<HealthStatus | null> {
		return this.healthCheckService.checkComponent(componentName);
	}

	getMetrics(): any {
		return this.metricsCollector.getMetricsSummary();
	}

	async getDetailedStats(): Promise<{
		health: SystemHealth;
		metrics: any;
		alerts: any;
		eventTracker: any;
		queueStats?: any;
	}> {
		const health = await this.getSystemHealth();
		const metrics = this.getMetrics();

		const stats: any = {
			health,
			metrics,
			alerts: {
				active: this.getActiveAlerts(),
				total: this.getAlertHistory().length,
			},
			eventTracker: {
				recentEvents: metrics.totalEvents,
				errorRate: 100 - metrics.successRate,
			},
		};

		if (this.eventQueue) {
			stats.queueStats = await this.eventQueue.getQueueStats();
		}

		return stats;
	}

	getActiveAlerts() {
		return this.alertService.getActiveAlerts();
	}

	getAlertHistory(limit?: number) {
		return this.alertService.getAlertHistory(limit);
	}

	clearAlert(alertId: string): boolean {
		return this.alertService.clearAlert(alertId);
	}
}

export { WebhookManager };

async function createWebhookManager(): Promise<WebhookManager> {
	dotenv.config();

	//! Obter configuração centralizada
	const configManager = ConfigManager.getInstance();

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

import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifySensible from '@fastify/sensible';
import fastify, {
	type FastifyInstance,
	type FastifyReply,
	type FastifyRequest,
} from 'fastify';
import type { AppConfig } from '../config/ConfigManager';
import {
	configureErrorHandling,
	WebhookInvalidFormatError,
	WebhookInvalidTokenError,
} from '../errors';
import { MetricsCollector } from '../services/MetricsCollector';
import { RedisEventTracker } from '../services/RedisEventTracker';
import type { WebhookEventQueue } from '../services/WebhookEventQueue';
import type { EventHandler } from '../types/eventhandler';
import type { WebhookEvent, WebhookPayload } from '../types/webhook';

export class MoodleWebhookServer {
	private server: FastifyInstance;
	private config: AppConfig;
	private eventHandlers: Map<string, EventHandler[]> = new Map();
	private startTime: number = Date.now();
	private eventQueue: WebhookEventQueue | undefined;
	private eventTracker: RedisEventTracker;
	private metricsCollector: MetricsCollector;

	constructor(
		config: AppConfig,
		eventQueue?: WebhookEventQueue,
		eventTracker?: RedisEventTracker,
		metricsCollector?: MetricsCollector,
	) {
		this.config = config;
		this.eventQueue = eventQueue;

		this.eventTracker =
			eventTracker || new RedisEventTracker(this.config.redis.url);

		this.server = fastify({
			logger: {
				level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
			},
			trustProxy: true,
			bodyLimit: 10 * 1024 * 1024, //* 10MB
		});

		this.metricsCollector = metricsCollector || new MetricsCollector();

		//! Configure error handling
		configureErrorHandling(this.server);

		this.setupPlugins();
		this.setupHooks();
		this.setupRoutes();
	}

	private async setupPlugins(): Promise<void> {
		//! CORS
		await this.server.register(fastifyCors, {
			origin: [this.config.moodle.baseUrl, 'http://localhost:9090/'],
			methods: ['POST', 'GET'],
			credentials: true,
		});

		//! Rate Limiting
		if (this.config.server.rateLimit) {
			await this.server.register(fastifyRateLimit, {
				max: this.config.server.rateLimit.max,
				timeWindow: this.config.server.rateLimit.windowMs,
				keyGenerator: (req: FastifyRequest) => {
					return req.ip || 'anonymous';
				},
			});
		}

		//! Helmet
		await this.server.register(fastifyHelmet, {
			contentSecurityPolicy: false,
		});

		//! Sensible
		await this.server.register(fastifySensible);
	}

	private setupHooks(): void {
		// this.server.addHook('onRequest', async (request: FastifyRequest) => {
		// 	request.log.info(`${request.method} ${request.url} - IP: ${request.ip}`);
		// });

		this.server.addHook(
			'onSend',
			async (_request: FastifyRequest, reply: FastifyReply, payload) => {
				reply.header('X-Powered-By', 'Moodle-Webhook-Integration');
				return payload;
			},
		);
	}

	private setupRoutes(): void {
		const webhookSchema = {
			body: {
				type: 'object',
				required: ['eventname', 'userid', 'timecreated', 'host', 'token'],
				properties: {
					eventname: { type: 'string' },
					component: { type: 'string' },
					action: { type: 'string' },
					target: { type: 'string' },
					objecttable: { type: 'string' },
					objectid: { type: ['number', 'string'] },
					crud: { type: 'string', enum: ['c', 'r', 'u', 'd'] },
					edulevel: { type: 'number' },
					contextid: { type: 'number' },
					contextlevel: { type: 'number' },
					contextinstanceid: { type: ['number', 'string'] },
					userid: { type: ['number', 'string'] },
					courseid: { type: 'number' },
					relateduserid: { type: ['number', 'string'] },
					anonymous: { type: 'number' },
					timecreated: { type: 'number' },
					other: { type: ['object', 'null'] },
					host: { type: 'string' },
					token: { type: 'string' },
					extra: { type: 'string' },
				},
			},
		};

		this.server.post<{ Body: WebhookEvent }>(
			this.config.server.hookPath,
			{ schema: webhookSchema },
			async (request, reply) => {
				const event = request.body;
				const startTime = Date.now();

				try {
					const eventId = RedisEventTracker.generateEventId(event);

					if (await this.eventTracker.isProcessed(eventId)) {
						this.server.log.info(
							`Event ${eventId} already processed, skipping`,
						);
						return reply.send({
							status: 'success',
							message: 'Event already processed',
							eventId,
							timestamp: new Date().toISOString(),
						});
					}

					const lockAcquired = await this.eventTracker.acquireLock(
						eventId,
						300,
					);

					if (!lockAcquired) {
						this.server.log.warn(
							`Event ${eventId} is being processed by another instance`,
						);
						return reply.send({
							status: 'success',
							message: 'Event is being processed',
							eventId,
							timestamp: new Date().toISOString(),
						});
					}

					//! Validar host
					if (!this.isValidHost(event.host)) {
						await this.eventTracker.releaseLock(eventId);
						throw new WebhookInvalidFormatError('Host inválido para webhook', {
							providedHost: event.host,
							expectedHost: this.config.moodle.baseUrl,
							eventname: event.eventname,
						});
					}

					//! Validar token
					if (!this.isValidToken(event.token)) {
						await this.eventTracker.releaseLock(eventId);
						throw new WebhookInvalidTokenError('Token de webhook inválido', {
							eventname: event.eventname,
							host: event.host,
						});
					}

					//! Responder imediatamente ao cliente
					reply.send({
						status: 'success',
						eventId,
						timestamp: new Date().toISOString(),
					});

					//! Processar evento de acordo com a estratégia definida
					await this.processEventSafely(event, eventId, startTime);
				} catch (error) {
					this.server.log.error('Error processing webhook:', error);
					if (!reply.sent) {
						reply.code(500).send({
							status: 'error',
							message: error instanceof Error ? error.message : 'Unknown error',
							timestamp: new Date().toISOString(),
						});
					}
				}
			},
		);

		this.server.get('/metrics', async (_request, reply) => {
			const summary = this.metricsCollector.getMetricsSummary();
			reply.header('Content-Type', 'application/json');
			return summary;
		});

		//* Rota para métricas Prometheus
		this.server.get('/metrics/prometheus', async (_request, reply) => {
			const prometheusMetrics = this.metricsCollector.exportPrometheusMetrics();
			reply.header('Content-Type', 'text/plain');
			return prometheusMetrics;
		});

		this.server.get('/health', async (_request, _reply) => {
			const uptime = Date.now() - this.startTime;
			const summary = this.metricsCollector.getMetricsSummary();
			return {
				status: 'healthy',
				timestamp: new Date().toISOString(),
				uptime: Math.floor(uptime / 1000),
				config: {
					enabledEvents: this.config.server.enabledEvents,
					handlersCount: this.eventHandlers.size,
				},
				metrics: summary,
				eventTracker: this.eventTracker ? 'connected' : 'not configured',
			};
		});
	}

	private isValidHost(host: string): boolean {
		return (
			host === 'localhost' ||
			host === this.config.moodle.baseUrl.replace(/https?:\/\//, '')
		);
	}

	private isValidToken(token: string): boolean {
		return token === this.config.moodle.token;
	}

	private async processEventSafely(
		event: WebhookEvent,
		eventId: string,
		startTime: number,
	): Promise<void> {
		try {
			//! Registrar evento recebido
			this.metricsCollector.recordEventReceived(event.eventname);

			//! Verificar se evento está habilitado
			if (!this.config.server.enabledEvents.includes(event.eventname)) {
				this.server.log.debug(`Event ignored: ${event.eventname}`);
				return;
			}

			//! Processar handlers (os handlers registrados serão responsáveis
			//! por decidir se processam localmente ou enfileiram)
			await this.processEventHandlers(event);

			this.server.log.info(`Event ${eventId} handlers invoked`);

			// Registrar sucesso e marcar como processado apenas se não estivermos
			// enviando o evento para uma fila (ou seja, processamento direto)
			if (!this.eventQueue?.isConnected) {
				const processingTime = Date.now() - startTime;
				this.metricsCollector.recordEventProcessed(
					event.eventname,
					processingTime,
				);

				await this.eventTracker.markAsProcessed(eventId, {
					processedAt: new Date(),
					processingTimeMs: processingTime,
					strategy: 'direct',
					eventType: event.eventname,
					userId: event.userid,
				});
			}
		} catch (error) {
			//! Registrar falha
			this.metricsCollector.recordEventFailed(
				event.eventname,
				error instanceof Error ? error : new Error('Unknown processing error'),
			);

			this.server.log.error(`Error processing event ${eventId}:`, error);

			await this.eventTracker.markAsFailed(
				eventId,
				error instanceof Error ? error : new Error('Unknown processing error'),
			);
		}
	}

	private async processEventHandlers(event: WebhookEvent): Promise<void> {
		const handlers = this.eventHandlers.get(event.eventname) || [];
		const wildcardHandlers = this.eventHandlers.get('*') || [];
		const allHandlers = [...handlers, ...wildcardHandlers];

		if (allHandlers.length === 0) {
			this.server.log.debug(`No handlers found for event: ${event.eventname}`);
			return;
		}

		const mockPayload: WebhookPayload = {
			token: event.token,
			events: [event],
			site: {
				id: '1',
				url: `http://${event.host}`,
				name: 'Moodle Site',
				version: '4.0',
			},
		};

		//! Executar todos os handlers
		for (const handler of allHandlers) {
			try {
				await handler(event, mockPayload);
			} catch (error) {
				this.server.log.error(`Handler error for ${event.eventname}:`, error);
				throw error;
			}
		}
	}

	on(eventName: string, handler: EventHandler): void {
		if (!this.eventHandlers.has(eventName)) {
			this.eventHandlers.set(eventName, []);
		}
		// biome-ignore lint/style/noNonNullAssertion: <any>
		this.eventHandlers.get(eventName)!.push(handler);
		this.server.log.info(`Handler registrado para evento: ${eventName}`);
	}

	onAny(handler: EventHandler): void {
		this.on('*', handler);
	}

	off(eventName: string, handler: EventHandler): void {
		const handlers = this.eventHandlers.get(eventName);
		if (handlers) {
			const index = handlers.indexOf(handler);
			if (index > -1) {
				handlers.splice(index, 1);
				this.server.log.info(`Handler removido para evento: ${eventName}`);
			}
		}
	}

	async start(): Promise<void> {
		try {
			const address = await this.server.listen({
				port: this.config.server.port,
				host: this.config.server.host,
			});

			this.server.log.info(
				`Endpoint: ${address}${this.config.server.hookPath}`,
			);
		} catch (error) {
			this.server.log.error(`Error to initialize: ${error}`);
			throw error;
		}
	}

	async stop(): Promise<void> {
		try {
			await this.server.close();
			this.server.log.info(`Webhook server stopped.`);
		} catch (error) {
			this.server.log.error(`Error to stop server: ${error}`);
			throw error;
		}
	}

	get instance(): FastifyInstance {
		return this.server;
	}
}

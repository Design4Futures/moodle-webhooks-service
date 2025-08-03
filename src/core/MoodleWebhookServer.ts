import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifySensible from '@fastify/sensible';
import fastify, {
	type FastifyInstance,
	type FastifyReply,
	type FastifyRequest,
} from 'fastify';
import {
	configureErrorHandling,
	WebhookInvalidFormatError,
	WebhookInvalidTokenError,
} from '../errors';
import type { WebhookEventQueue } from '../services/WebhookEventQueue';
import type { EventHandler } from '../types/eventhandler';
import type {
	WebhookConfig,
	WebhookEvent,
	WebhookPayload,
} from '../types/webhook';

export class MoodleWebhookServer {
	private server: FastifyInstance;
	private config: WebhookConfig;
	private eventHandlers: Map<string, EventHandler[]> = new Map();
	private startTime: number = Date.now();
	private eventQueue: WebhookEventQueue | undefined;

	constructor(config: WebhookConfig, eventQueue?: WebhookEventQueue) {
		this.config = config;
		this.eventQueue = eventQueue;
		this.server = fastify({
			logger: {
				level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
			},
			trustProxy: true,
			bodyLimit: 10 * 1024 * 1024, //* 10MB
		});

		// Configure error handling
		configureErrorHandling(this.server);

		this.setupPlugins();
		this.setupHooks();
		this.setupRoutes();
	}

	private async setupPlugins(): Promise<void> {
		//! CORS
		await this.server.register(fastifyCors, {
			origin: [this.config.moodleUrl],
			methods: ['POST', 'GET'],
			credentials: true,
		});

		//! Rate Limiting
		if (this.config.rateLimiting) {
			await this.server.register(fastifyRateLimit, {
				max: this.config.rateLimiting.max,
				timeWindow: this.config.rateLimiting.timeWindow,
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
			this.config.path,
			{ schema: webhookSchema },
			async (request, _reply) => {
				const event = request.body;

				console.log('event', event);

				//! Validar host
				if (!this.isValidHost(event.host)) {
					throw new WebhookInvalidFormatError('Host inválido para webhook', {
						providedHost: event.host,
						expectedHost: this.config.moodleUrl,
						eventname: event.eventname,
					});
				}

				//! Validar token
				if (!this.isValidToken(event.token)) {
					throw new WebhookInvalidTokenError('Token de webhook inválido', {
						eventname: event.eventname,
						host: event.host,
					});
				}

				//! Processar evento
				await this.processEvent(event);

				return {
					status: 'success',
					timestamp: new Date().toISOString(),
				};
			},
		);

		this.server.get('/health', async (_request, _reply) => {
			const uptime = Date.now() - this.startTime;

			return {
				status: 'healthy',
				timestamp: new Date().toISOString(),
				uptime: Math.floor(uptime / 1000),
				config: {
					enabledEvents: this.config.enabledEvents,
					handlersCount: this.eventHandlers.size,
				},
			};
		});
	}

	private isValidHost(host: string): boolean {
		return (
			host === 'localhost' ||
			host === this.config.moodleUrl.replace(/https?:\/\//, '')
		);
	}

	private isValidToken(token: string): boolean {
		return token === this.config.secret;
	}

	private async processEvent(event: WebhookEvent): Promise<void> {
		if (!this.config.enabledEvents.includes(event.eventname)) {
			this.server.log.debug(`Evento ignorado: ${event.eventname}`);
			return;
		}

		this.server.log.info(
			`Processando evento: ${event.eventname} - Usuário: ${event.userid}`,
		);

		//! Se RabbitMQ estiver configurado, envia o evento para a fila
		if (this.eventQueue?.isConnected) {
			try {
				await this.eventQueue.publishEvent(event);
				this.server.log.info(`Evento ${event.eventname} enviado para RabbitMQ`);
			} catch (error) {
				this.server.log.error(`Erro ao enviar evento para RabbitMQ:`, error);
			}
		}

		const handlers = this.eventHandlers.get(event.eventname) || [];
		const wildcardHandlers = this.eventHandlers.get('*') || [];

		const allHandlers = [...handlers, ...wildcardHandlers];

		for (const handler of allHandlers) {
			try {
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
				await handler(event, mockPayload);
			} catch (error) {
				this.server.log.error(
					`Erro no handler para ${event.eventname}:`,
					error,
				);
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
				port: this.config.port,
				host: this.config.host || '0.0.0.0',
			});

			this.server.log.info(`Endpoint: ${address}${this.config.path}`);
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

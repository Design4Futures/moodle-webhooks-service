import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifySensible from '@fastify/sensible';
import fastify, { type FastifyInstance, type FastifyRequest } from 'fastify';
import type { WebhookConfig, WebhookPayload } from '../types/webhook';

export class MoodleWebhookServer {
	private server: FastifyInstance;
	private config: WebhookConfig;

	constructor(config: WebhookConfig) {
		this.config = config;
		this.server = fastify({
			logger: {
				level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
			},
			trustProxy: true,
			bodyLimit: 10 * 1024 * 1024, // 10MB
		});

		this.setupPlugins();
		this.setupRoutes();
	}

	private async setupPlugins(): Promise<void> {
		// CORS
		await this.server.register(fastifyCors, {
			origin: [this.config.moodleUrl],
			methods: ['POST', 'GET'],
			credentials: true,
		});

		// Rate Limiting
		if (this.config.rateLimiting) {
			await this.server.register(fastifyRateLimit, {
				max: this.config.rateLimiting.max,
				timeWindow: this.config.rateLimiting.timeWindow,
				keyGenerator: (req: FastifyRequest) => {
					return req.ip || 'anonymous';
				},
			});
		}

		// Helmet
		await this.server.register(fastifyHelmet, {
			contentSecurityPolicy: false,
		});

		// Sensible
		await this.server.register(fastifySensible);
	}

	private setupRoutes(): void {
		const webhookSchema = {
			body: {
				type: 'object',
				required: ['token', 'events', 'site'],
				properties: {
					token: { type: 'string' },
					events: {
						type: 'array',
						items: {
							type: 'object',
							required: ['eventname', 'userid', 'timecreated'],
							properties: {
								eventname: { type: 'string' },
								component: { type: 'string' },
								action: { type: 'string' },
								target: { type: 'string' },
								objecttable: { type: 'string' },
								objectid: { type: 'number' },
								crud: { type: 'string', enum: ['c', 'r', 'u', 'd'] },
								userid: { type: 'number' },
								courseid: { type: 'number' },
								relateduserid: { type: 'number' },
								timecreated: { type: 'number' },
								other: { type: 'object' },
							},
						},
					},
					site: {
						type: 'object',
						required: ['id', 'url', 'name'],
						properties: {
							id: { type: 'string' },
							url: { type: 'string' },
							name: { type: 'string' },
							version: { type: 'string' },
						},
					},
				},
			},
		};

		this.server.post<{ Body: WebhookPayload }>(
			this.config.path,
			{ schema: webhookSchema },
			async (request, reply) => {
				const payload = request.body;

				return {
					status: 'success',
					timestamp: new Date().toISOString(),
				};
			},
		);
	}
}

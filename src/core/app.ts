import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifySensible from '@fastify/sensible';
import fastify, { type FastifyInstance, type FastifyRequest } from 'fastify';
import type { WebhookConfig } from '../types/webhook';

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
}

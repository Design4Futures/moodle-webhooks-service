import type { FastifyRequest } from 'fastify';
import type { WebhookPayload } from './webhook';

export interface WebhookRequest extends FastifyRequest {
	Body: WebhookPayload;
}

export interface HealthCheckReply {
	status: string;
	timestamp: string;
	uptime: number;
	config: {
		enabledEvents: string[];
		handlersCount: number;
	};
}

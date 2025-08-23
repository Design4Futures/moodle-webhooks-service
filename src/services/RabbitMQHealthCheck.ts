import { ConfigManager } from '../config/ConfigManager';
import type { HealthStatus, IHealthCheck } from '../interfaces/IHealthCheck';
import type { WebhookEventQueue } from './WebhookEventQueue';

export class RabbitMQHealthCheck implements IHealthCheck {
	private config = ConfigManager.getInstance().getHealthCheckConfig();
	name = 'rabbitmq-queue';
	timeout = this.config.timeout;

	constructor(private eventQueue?: WebhookEventQueue) {}

	async check(): Promise<HealthStatus> {
		const startTime = Date.now();

		if (!this.eventQueue) {
			return {
				status: 'DEGRADED',
				responseTime: 0,
				timestamp: new Date(),
				details: { message: 'Queue not configured' },
			};
		}

		try {
			const stats = await Promise.race([
				this.eventQueue.getQueueStats(),
				new Promise((_, reject) =>
					setTimeout(() => reject(new Error('Timeout')), this.timeout),
				),
			]);

			return {
				status: this.eventQueue.isConnected ? 'UP' : 'DOWN',
				responseTime: Date.now() - startTime,
				timestamp: new Date(),
				details: {
					isConnected: this.eventQueue.isConnected,
					queueStats: stats,
				},
			};
		} catch (error) {
			return {
				status: 'DOWN',
				responseTime: Date.now() - startTime,
				timestamp: new Date(),
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}
}

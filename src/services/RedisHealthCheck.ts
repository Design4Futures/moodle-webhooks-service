import type { IEventTracker } from '../interfaces/IEventTracker';
import type { HealthStatus, IHealthCheck } from '../interfaces/IHealthCheck';

export class RedisHealthCheck implements IHealthCheck {
	name = 'redis-event-tracker';
	timeout = 5000;

	constructor(private eventTracker: IEventTracker) {}

	async check(): Promise<HealthStatus> {
		const startTime = Date.now();

		try {
			// Teste simples de conectividade
			const testKey = `health:${Date.now()}`;
			await Promise.race([
				this.eventTracker.markAsProcessed(testKey, {
					processedAt: new Date(),
					processingTimeMs: 1,
					strategy: 'direct',
					eventType: 'health-check',
					userId: 'system',
				}),
				new Promise((_, reject) =>
					setTimeout(() => reject(new Error('Timeout')), this.timeout),
				),
			]);

			return {
				status: 'UP',
				responseTime: Date.now() - startTime,
				timestamp: new Date(),
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

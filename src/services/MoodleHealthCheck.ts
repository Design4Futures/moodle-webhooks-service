import type { HealthStatus, IHealthCheck } from '../interfaces/IHealthCheck';
import type { MoodleClient } from '../lib/MoodleClient';

export class MoodleHealthCheck implements IHealthCheck {
	name = 'moodle-api';
	timeout = 10000;

	constructor(private moodleClient: MoodleClient) {}

	async check(): Promise<HealthStatus> {
		const startTime = Date.now();

		try {
			await Promise.race([
				this.moodleClient.testConnection(),
				new Promise((_, reject) =>
					setTimeout(() => reject(new Error('Timeout')), this.timeout),
				),
			]);

			return {
				status: 'UP',
				responseTime: Date.now() - startTime,
				timestamp: new Date(),
				details: {
					baseUrl: this.moodleClient['config'].baseUrl,
					circuitBreaker: this.moodleClient.getCircuitBreakerStats(),
				},
			};
		} catch (error) {
			return {
				status: 'DOWN',
				responseTime: Date.now() - startTime,
				timestamp: new Date(),
				error: error instanceof Error ? error.message : 'Unknown error',
				details: {
					circuitBreaker: this.moodleClient.getCircuitBreakerStats(),
				},
			};
		}
	}
}

import { ConfigManager } from '../config/ConfigManager';
import type { HealthStatus, IHealthCheck } from '../interfaces/IHealthCheck';
import type { ServiceClient } from '../lib/ServiceClient';

export class ServiceHealthCheck implements IHealthCheck {
	private config = ConfigManager.getInstance().getHealthCheckConfig();
	name = 'microcredentials-api';
	timeout = this.config.timeout;

	constructor(private serviceClient: ServiceClient) {}

	async check(): Promise<HealthStatus> {
		const startTime = Date.now();

		try {
			await Promise.race([
				this.serviceClient.testConnection(),
				new Promise((_, reject) =>
					setTimeout(() => reject(new Error('Timeout')), this.timeout),
				),
			]);

			return {
				status: 'UP',
				responseTime: Date.now() - startTime,
				timestamp: new Date(),
				details: {
					baseUrl: this.serviceClient['config'].service.baseUrl,
					circuitBreaker: this.serviceClient.getCircuitBreakerStats(),
				},
			};
		} catch (error) {
			return {
				status: 'DOWN',
				responseTime: Date.now() - startTime,
				timestamp: new Date(),
				error: error instanceof Error ? error.message : 'Unknown error',
				details: {
					circuitBreaker: this.serviceClient.getCircuitBreakerStats(),
				},
			};
		}
	}
}

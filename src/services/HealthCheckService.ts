import type {
	HealthStatus,
	IHealthCheck,
	SystemHealth,
} from '../interfaces/IHealthCheck';

export class HealthCheckService {
	private healthChecks: IHealthCheck[] = [];
	private startTime = Date.now();

	addHealthCheck(healthCheck: IHealthCheck): void {
		this.healthChecks.push(healthCheck);
	}

	async checkAll(): Promise<SystemHealth> {
		const results: Record<string, HealthStatus> = {};

		//! Executar todos os health checks em paralelo
		const checkPromises = this.healthChecks.map(async (check) => {
			try {
				const result = await check.check();
				results[check.name] = result;
			} catch (error) {
				results[check.name] = {
					status: 'DOWN',
					timestamp: new Date(),
					error: error instanceof Error ? error.message : 'Health check failed',
				};
			}
		});

		await Promise.allSettled(checkPromises);

		//! Determinar status geral do sistema
		const statuses = Object.values(results).map((r) => r.status);
		let overallStatus: 'UP' | 'DOWN' | 'DEGRADED' = 'UP';

		if (statuses.includes('DOWN')) {
			overallStatus = 'DOWN';
		} else if (statuses.includes('DEGRADED')) {
			overallStatus = 'DEGRADED';
		}

		return {
			status: overallStatus,
			components: results,
			timestamp: new Date(),
			uptime: Math.floor((Date.now() - this.startTime) / 1000),
		};
	}

	async checkComponent(componentName: string): Promise<HealthStatus | null> {
		const healthCheck = this.healthChecks.find(
			(hc) => hc.name === componentName,
		);
		if (!healthCheck) return null;

		try {
			return await healthCheck.check();
		} catch (error) {
			return {
				status: 'DOWN',
				timestamp: new Date(),
				error: error instanceof Error ? error.message : 'Health check failed',
			};
		}
	}
}

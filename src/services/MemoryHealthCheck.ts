import { ConfigManager } from '../config/ConfigManager';
import type { HealthStatus, IHealthCheck } from '../interfaces/IHealthCheck';

export class MemoryHealthCheck implements IHealthCheck {
	private config = ConfigManager.getInstance().getHealthCheckConfig();
	name = 'memory-usage';

	constructor(private maxMemoryMB: number = this.config.memoryLimitMB) {}

	async check(): Promise<HealthStatus> {
		const memUsage = process.memoryUsage();
		const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
		const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
		const rssMB = memUsage.rss / 1024 / 1024;

		const isOverLimit = heapUsedMB > this.maxMemoryMB;
		const usagePercentage = (heapUsedMB / this.maxMemoryMB) * 100;

		return {
			status: isOverLimit ? 'DEGRADED' : 'UP',
			timestamp: new Date(),
			details: {
				heapUsedMB: Math.round(heapUsedMB * 100) / 100,
				heapTotalMB: Math.round(heapTotalMB * 100) / 100,
				rssMB: Math.round(rssMB * 100) / 100,
				usagePercentage: Math.round(usagePercentage * 100) / 100,
				maxMemoryMB: this.maxMemoryMB,
			},
		};
	}
}

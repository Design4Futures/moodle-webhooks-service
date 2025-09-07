export interface HealthStatus {
	status: 'UP' | 'DOWN' | 'DEGRADED';
	details?: Record<string, any>;
	responseTime?: number;
	error?: string;
	timestamp: Date;
}

export interface IHealthCheck {
	name: string;
	timeout?: number;
	check(): Promise<HealthStatus>;
}

export interface SystemHealth {
	status: 'UP' | 'DOWN' | 'DEGRADED';
	components: Record<string, HealthStatus>;
	timestamp: Date;
	uptime: number;
}

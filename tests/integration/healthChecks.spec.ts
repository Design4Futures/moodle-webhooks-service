// tests/integration/healthChecks.test.ts
import { HealthCheckService } from '../../src/services/HealthCheck';
import { MemoryHealthCheck } from '../../src/services/MemoryHealthCheck';

describe('Health Checks Tests', () => {
	let healthService: HealthCheckService;

	beforeEach(() => {
		healthService = new HealthCheckService();
	});

	it('should report system health correctly', async () => {
		// Adicionar um health check que sempre passa
		healthService.addHealthCheck({
			name: 'test-check-pass',
			check: async () => ({
				status: 'UP',
				timestamp: new Date(),
			}),
		});

		// Adicionar um health check que sempre falha
		healthService.addHealthCheck({
			name: 'test-check-fail',
			check: async () => ({
				status: 'DOWN',
				timestamp: new Date(),
				error: 'Test failure',
			}),
		});

		const health = await healthService.checkAll();

		expect(health.status).toBe('DOWN'); // Sistema DOWN por causa do componente com falha
		expect(health.components).toHaveProperty('test-check-pass');
		expect(health.components).toHaveProperty('test-check-fail');
		expect(health.components['test-check-pass'].status).toBe('UP');
		expect(health.components['test-check-fail'].status).toBe('DOWN');
	});

	it('should detect memory issues', async () => {
		const memoryCheck = new MemoryHealthCheck(1); // 1MB limit (muito baixo para testar)

		const status = await memoryCheck.check();

		// Com limite tão baixo, deve reportar DEGRADED
		expect(status.status).toBe('DEGRADED');
		expect(status.details).toHaveProperty('heapUsedMB');
		expect(status.details).toHaveProperty('usagePercentage');
	});
});

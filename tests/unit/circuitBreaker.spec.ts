// tests/unit/circuitBreaker.test.ts
import {
	CircuitBreaker,
	CircuitState,
} from '../../src/services/CircuitBreaker';

describe('Circuit Breaker Tests', () => {
	let circuitBreaker: CircuitBreaker;

	beforeEach(() => {
		circuitBreaker = new CircuitBreaker({
			failureThreshold: 3,
			resetTimeout: 1000,
			monitoringPeriod: 5000,
		});
	});

	it('should open circuit after failure threshold', async () => {
		const failingOperation = async () => {
			throw new Error('Operation failed');
		};

		// Execute operation até atingir o threshold
		for (let i = 0; i < 3; i++) {
			try {
				await circuitBreaker.execute(failingOperation);
			} catch (error) {
				// Esperado falhar
			}
		}

		const stats = circuitBreaker.getStats();
		expect(stats.state).toBe(CircuitState.OPEN);
		expect(stats.failures).toBe(3);
	});

	it('should reset to closed after successful operation in half-open state', async () => {
		const failingOperation = async () => {
			throw new Error('Fail');
		};
		const successfulOperation = async () => 'success';

		// Abrir o circuit
		for (let i = 0; i < 3; i++) {
			try {
				await circuitBreaker.execute(failingOperation);
			} catch {}
		}

		// Aguardar timeout para ir para HALF_OPEN
		await new Promise((resolve) => setTimeout(resolve, 1100));

		// Operação com sucesso deve fechar o circuit
		const result = await circuitBreaker.execute(successfulOperation);
		expect(result).toBe('success');

		const stats = circuitBreaker.getStats();
		expect(stats.state).toBe(CircuitState.CLOSED);
	});
});

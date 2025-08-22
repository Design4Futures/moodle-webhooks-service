export interface CircuitBreakerOptions {
	failureThreshold: number;
	resetTimeout: number;
	monitoringPeriod: number;
	expectedErrors?: Array<new (...args: any[]) => Error>;
}

export enum CircuitState {
	CLOSED = 'CLOSED',
	OPEN = 'OPEN',
	HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerStats {
	state: CircuitState;
	failures: number;
	successes: number;
	lastFailureTime?: Date | undefined;
	nextAttemptTime?: Date | undefined;
}

export class CircuitBreaker {
	private state: CircuitState = CircuitState.CLOSED;
	private failures: number = 0;
	private successes: number = 0;
	private lastFailureTime?: Date | undefined;
	private nextAttemptTime?: Date | undefined;
	private readonly options: Required<CircuitBreakerOptions>;

	constructor(options: CircuitBreakerOptions) {
		this.options = {
			expectedErrors: [],
			...options,
		};
	}

	async execute<T>(operation: () => Promise<T>): Promise<T> {
		if (this.state === CircuitState.OPEN) {
			if (this.canAttemptReset()) {
				this.state = CircuitState.HALF_OPEN;
				console.log('Circuit breaker moving to HALF_OPEN state');
			} else {
				throw new Error(
					`Circuit breaker is OPEN. Next attempt at: ${this.nextAttemptTime}`,
				);
			}
		}

		try {
			const result = await operation();
			this.onSuccess();
			return result;
		} catch (error) {
			this.onFailure(error as Error);
			throw error;
		}
	}

	private canAttemptReset(): boolean {
		return this.nextAttemptTime
			? Date.now() >= this.nextAttemptTime.getTime()
			: false;
	}

	private onSuccess(): void {
		this.failures = 0;
		this.successes++;

		if (this.state === CircuitState.HALF_OPEN) {
			this.state = CircuitState.CLOSED;
			console.log('Circuit breaker reset to CLOSED state');
		}
	}

	private onFailure(error: Error): void {
		//! Não contar erros esperados como falhas do circuit
		if (this.isExpectedError(error)) {
			return;
		}

		this.failures++;
		this.lastFailureTime = new Date();

		if (this.failures >= this.options.failureThreshold) {
			this.state = CircuitState.OPEN;
			this.nextAttemptTime = new Date(Date.now() + this.options.resetTimeout);
			console.log(
				`Circuit breaker OPENED after ${this.failures} failures. Will retry at: ${this.nextAttemptTime}`,
			);
		}
	}

	private isExpectedError(error: Error): boolean {
		return this.options.expectedErrors.some(
			(ErrorClass) => error instanceof ErrorClass,
		);
	}

	getStats(): CircuitBreakerStats {
		return {
			state: this.state,
			failures: this.failures,
			successes: this.successes,
			lastFailureTime: this.lastFailureTime,
			nextAttemptTime: this.nextAttemptTime,
		};
	}

	reset(): void {
		this.state = CircuitState.CLOSED;
		this.failures = 0;
		this.lastFailureTime = undefined;
		this.nextAttemptTime = undefined;
		console.log('Circuit breaker manually reset');
	}
}

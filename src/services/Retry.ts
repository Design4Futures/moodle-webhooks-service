export interface RetryOptions {
	maxAttempts: number;
	baseDelay: number;
	maxDelay: number;
	backoffFactor: number;
	jitter: boolean;
	retryCondition?: (error: Error) => boolean;
}

export interface RetryResult<T> {
	success: boolean;
	result?: T;
	error?: Error;
	attempts: number;
	totalTime: number;
}

const defaultOptions: RetryOptions = {
	maxAttempts: 3,
	baseDelay: 1000,
	maxDelay: 30000,
	backoffFactor: 2,
	jitter: true,
	retryCondition: (error) => !error.message.includes('authentication'),
};

export async function executeWithRetry<T>(
	operation: () => Promise<T>,
	options: Partial<RetryOptions> = {},
): Promise<RetryResult<T>> {
	const config = { ...defaultOptions, ...options };
	const startTime = Date.now();

	let lastError: Error | undefined;

	for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
		try {
			const result = await operation();
			return {
				success: true,
				result,
				attempts: attempt,
				totalTime: Date.now() - startTime,
			};
		} catch (error) {
			lastError = error as Error;

			// Verificar se deve tentar novamente
			if (
				attempt === config.maxAttempts ||
				(config.retryCondition && !config.retryCondition(lastError))
			) {
				break;
			}

			// Calcular delay para próxima tentativa
			const delay = calculateDelay(attempt, config);

			console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms:`, {
				error: lastError.message,
				attempt,
				maxAttempts: config.maxAttempts,
			});

			await sleep(delay);
		}
	}

	const result: RetryResult<T> = {
		success: false,
		attempts: config.maxAttempts,
		totalTime: Date.now() - startTime,
	};
	if (lastError !== undefined) {
		result.error = lastError;
	}
	return result;
}

function calculateDelay(attempt: number, options: RetryOptions): number {
	let delay = options.baseDelay * options.backoffFactor ** (attempt - 1);
	delay = Math.min(delay, options.maxDelay);

	if (options.jitter) {
		// Adicionar jitter para evitar thundering herd
		delay = delay + Math.random() * delay * 0.1;
	}

	return Math.round(delay);
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

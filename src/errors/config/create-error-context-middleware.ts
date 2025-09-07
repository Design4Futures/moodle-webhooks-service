export function createErrorContextMiddleware() {
	// biome-ignore lint/suspicious/noExplicitAny: Middleware flexibility for request/reply
	return async (request: any, _reply: any, next: () => void) => {
		request.errorContext = {
			requestId: request.id,
			method: request.method,
			url: request.url,
			ip: request.ip,
			userAgent: request.headers['user-agent'],
			timestamp: new Date().toISOString(),
		};

		next();
	};
}

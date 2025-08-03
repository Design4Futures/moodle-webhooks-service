export interface ErrorLogger {
	error(message: string, context?: Record<string, unknown>): void;
	warn(message: string, context?: Record<string, unknown>): void;
	info(message: string, context?: Record<string, unknown>): void;
	debug(message: string, context?: Record<string, unknown>): void;
}

export interface ErrorHandlerConfig {
	logger: ErrorLogger;
	includeStackTrace: boolean;
	logLevel: 'error' | 'warn' | 'info' | 'debug';
	enableDetailedErrors: boolean;
	enableErrorMetrics?: boolean;
}

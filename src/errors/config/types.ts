import type { ErrorLogger } from '../handler/types';

export interface ErrorHandlingOptions {
	enableMetrics?: boolean;
	enableStackTrace?: boolean;
	logLevel?: 'error' | 'warn' | 'info' | 'debug';
	enableDetailedErrors?: boolean;
	customLogger?: ErrorLogger;
	gracefulShutdownTimeout?: number;
}

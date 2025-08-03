import type { ErrorLogger } from '../handler/types';

export class FastifyErrorLogger implements ErrorLogger {
	constructor(
		private fastifyLogger?: {
			error: (obj: Record<string, unknown>, msg?: string) => void;
			warn: (obj: Record<string, unknown>, msg?: string) => void;
			info: (obj: Record<string, unknown>, msg?: string) => void;
			debug: (obj: Record<string, unknown>, msg?: string) => void;
		},
	) {}

	error(message: string, context?: Record<string, unknown>): void {
		if (this.fastifyLogger) {
			this.fastifyLogger.error({ context }, message);
		} else {
			console.error(`[ERROR] ${message}`, context);
		}
	}

	warn(message: string, context?: Record<string, unknown>): void {
		if (this.fastifyLogger) {
			this.fastifyLogger.warn({ context }, message);
		} else {
			console.warn(`[WARN] ${message}`, context);
		}
	}

	info(message: string, context?: Record<string, unknown>): void {
		if (this.fastifyLogger) {
			this.fastifyLogger.info({ context }, message);
		} else {
			console.info(`[INFO] ${message}`, context);
		}
	}

	debug(message: string, context?: Record<string, unknown>): void {
		if (this.fastifyLogger) {
			this.fastifyLogger.debug({ context }, message);
		} else {
			console.debug(`[DEBUG] ${message}`, context);
		}
	}
}

export abstract class BaseError extends Error {
	public override readonly name: string;
	public readonly timestamp: Date;
	public readonly errorCode: string;
	public readonly statusCode: number;
	public readonly isOperational: boolean;
	public readonly context: Record<string, unknown> | undefined;
	public override readonly stack?: string;

	constructor(
		message: string,
		errorCode: string,
		statusCode: number = 500,
		isOperational: boolean = true,
		context?: Record<string, unknown>,
	) {
		super(message);

		Object.setPrototypeOf(this, new.target.prototype);

		this.name = this.constructor.name;
		this.errorCode = errorCode;
		this.statusCode = statusCode;
		this.isOperational = isOperational;
		this.context = context;
		this.timestamp = new Date();

		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, this.constructor);
		}
	}

	toJSON(): Record<string, unknown> {
		return {
			name: this.name,
			message: this.message,
			errorCode: this.errorCode,
			statusCode: this.statusCode,
			timestamp: this.timestamp.toISOString(),
			isOperational: this.isOperational,
			context: this.context,
			stack: this.stack,
		};
	}

	toLogFormat(): Record<string, unknown> {
		return {
			name: this.name,
			message: this.message,
			errorCode: this.errorCode,
			timestamp: this.timestamp.toISOString(),
			context: this.context,
		};
	}

	static isOperationalError(error: Error): boolean {
		if (error instanceof BaseError) {
			return error.isOperational;
		}
		return false;
	}
}

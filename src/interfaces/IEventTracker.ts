export interface IEventTracker {
	isProcessed(eventId: string): Promise<boolean>;
	markAsProcessed(eventId: string, metadata?: EventMetadata): Promise<void>;
	markAsFailed(
		eventId: string,
		error: Error,
		retryCount?: number,
	): Promise<void>;
	getProcessingStatus(eventId: string): Promise<ProcessingStatus | null>;
	cleanupOldEntries(olderThanMs: number): Promise<number>;
}

export interface EventMetadata {
	processedAt: Date;
	processingTimeMs: number;
	strategy: 'direct' | 'queue' | 'hybrid';
	eventType: string;
	userId: string | number;
}

export interface ProcessingStatus {
	status: 'processing' | 'completed' | 'failed';
	attempts: number;
	lastError?: string;
	processedAt?: Date;
	metadata?: EventMetadata;
}

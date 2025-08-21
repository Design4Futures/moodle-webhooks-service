import crypto from 'node:crypto';
import Redis from 'ioredis';
import type {
	EventMetadata,
	IEventTracker,
	ProcessingStatus,
} from '../interfaces/IEventTracker';
import type { WebhookEvent } from '../types/webhook';

export class RedisEventTracker implements IEventTracker {
	private redis: Redis;
	private keyPrefix = 'webhook:events';
	private lockPrefix = 'webhook:locks';
	private defaultTTL = 24 * 60 * 60; //* 24 horas

	constructor(redisUrl: string) {
		this.redis = new Redis(redisUrl, {
			lazyConnect: true,
			maxRetriesPerRequest: 3,
		});
	}

	static generateEventId(event: WebhookEvent): string {
		const dataToHash = `${event.eventname}:${event.objectid}:${event.userid}:${event.timecreated}:${event.host}`;
		return crypto
			.createHash('sha256')
			.update(dataToHash)
			.digest('hex')
			.substring(0, 16);
	}

	private getEventKey(eventId: string): string {
		return `${this.keyPrefix}:${eventId}`;
	}

	private getLockKey(eventId: string): string {
		return `${this.lockPrefix}:${eventId}`;
	}

	async isProcessed(eventId: string): Promise<boolean> {
		const status = await this.getProcessingStatus(eventId);
		return status?.status === 'completed';
	}

	async acquireLock(
		eventId: string,
		ttlSeconds: number = 300,
	): Promise<boolean> {
		const lockKey = this.getLockKey(eventId);
		const lockValue = `${Date.now()}-${Math.random()}`;

		const result = await this.redis.set(
			lockKey,
			lockValue,
			'EX',
			ttlSeconds,
			'NX',
		);
		return result === 'OK';
	}

	async releaseLock(eventId: string): Promise<void> {
		const lockKey = this.getLockKey(eventId);
		await this.redis.del(lockKey);
	}

	async markAsProcessed(
		eventId: string,
		metadata?: EventMetadata,
	): Promise<void> {
		const key = this.getEventKey(eventId);
		const data: ProcessingStatus = {
			status: 'completed',
			attempts: 1,
			processedAt: new Date(),
			...(metadata ? { metadata } : {}),
		};

		await this.redis.setex(key, this.defaultTTL, JSON.stringify(data));
		await this.releaseLock(eventId);
	}

	async markAsFailed(
		eventId: string,
		error: Error,
		retryCount?: number,
	): Promise<void> {
		const key = this.getEventKey(eventId);
		const existing = await this.getProcessingStatus(eventId);

		const data: ProcessingStatus = {
			status: 'failed',
			attempts:
				existing?.attempts !== undefined
					? existing.attempts + 1
					: retryCount !== undefined
						? retryCount
						: 1,
			lastError: error.message,
			...(existing?.metadata ? { metadata: existing.metadata } : {}),
		};

		await this.redis.setex(key, this.defaultTTL, JSON.stringify(data));
		await this.releaseLock(eventId);
	}

	async getProcessingStatus(eventId: string): Promise<ProcessingStatus | null> {
		const key = this.getEventKey(eventId);
		const data = await this.redis.get(key);

		if (!data) return null;

		try {
			const parsed = JSON.parse(data);

			if (parsed.processedAt) parsed.processedAt = new Date(parsed.processedAt);

			return parsed;
		} catch (error) {
			console.error('Error parsing processing status:', error);
			return null;
		}
	}

	async cleanupOldEntries(olderThanMs: number): Promise<number> {
		const cutoffDate = new Date(Date.now() - olderThanMs);
		const keys = await this.redis.keys(`${this.keyPrefix}:*`);

		let cleanedCount = 0;
		for (const key of keys) {
			const data = await this.redis.get(key);

			if (data) {
				try {
					const status = JSON.parse(data);
					if (status.processedAt && new Date(status.processedAt) < cutoffDate) {
						await this.redis.del(key);
						cleanedCount++;
					}
				} catch (_error) {
					await this.redis.del(key);
					cleanedCount++;
				}
			}
		}

		return cleanedCount;
	}

	async disconnect(): Promise<void> {
		await this.redis.quit();
	}
}

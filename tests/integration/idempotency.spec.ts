// tests/integration/idempotency.test.ts
import { RedisEventTracker } from '../../src/services/RedisEventTracker';
import type { WebhookEvent } from '../../src/types/webhook';

describe('Idempotency Tests', () => {
	let eventTracker: RedisEventTracker;

	beforeAll(async () => {
		eventTracker = new RedisEventTracker(
			process.env.REDIS_TEST_URL || 'redis://localhost:6379',
		);
	});

	afterAll(async () => {
		await eventTracker.disconnect();
	});

	it('should detect duplicate events', async () => {
		const event: WebhookEvent = {
			eventname: '\\core\\event\\user_created',
			component: 'core',
			action: 'created',
			target: 'user',
			objecttable: 'user',
			objectid: 123,
			crud: 'c',
			edulevel: 2,
			contextid: 1,
			contextlevel: 10,
			contextinstanceid: 0,
			userid: 123,
			courseid: 1,
			anonymous: 0,
			other: {},
			timecreated: 1640995200,
			host: 'test.moodle.com',
			token: 'test-token',
			extra: 'test',
		};

		const eventId = RedisEventTracker.generateEventId(event);

		// Primeiro processamento
		const isProcessedBefore = await eventTracker.isProcessed(eventId);
		expect(isProcessedBefore).toBe(false);

		await eventTracker.markAsProcessed(eventId);

		// Segundo processamento (deve ser detectado como duplicado)
		const isProcessedAfter = await eventTracker.isProcessed(eventId);
		expect(isProcessedAfter).toBe(true);
	});

	it('should handle concurrent processing attempts', async () => {
		const event: WebhookEvent = {
			eventname: '\\core\\event\\user_created',
			component: 'core',
			action: 'created',
			target: 'user',
			objecttable: 'user',
			objectid: 123,
			crud: 'c',
			edulevel: 2,
			contextid: 1,
			contextlevel: 10,
			contextinstanceid: 0,
			userid: 123,
			courseid: 1,
			anonymous: 0,
			other: {},
			timecreated: 1640995200,
			host: 'test.moodle.com',
			token: 'test-token',
			extra: 'test',
		};

		const eventId = RedisEventTracker.generateEventId(event);

		// Simular tentativas concorrentes de processamento
		const promises = Array(5)
			.fill(0)
			.map(async () => {
				return eventTracker.acquireLock(eventId, 60);
			});

		const results = await Promise.all(promises);

		// Apenas um deve conseguir o lock
		const lockAcquired = results.filter((result) => result === true);
		expect(lockAcquired).toHaveLength(1);
	});
});

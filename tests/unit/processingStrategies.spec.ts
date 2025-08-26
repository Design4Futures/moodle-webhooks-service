import type {
	IEventHandlerMapper,
	IEventQueue,
} from '../../src/interfaces/EventInterfaces';
import { DirectProcessingStrategy } from '../../src/strategies/DirectProcessingStrategy';
import { HybridProcessingStrategy } from '../../src/strategies/HybridProcessingStrategy';
import { QueueProcessingStrategy } from '../../src/strategies/QueueProcessingStrategy';
import type { WebhookEvent, WebhookPayload } from '../../src/types/webhook';

describe('Event processing strategies', () => {
	const sampleEvent: WebhookEvent = {
		eventname: '\\core\\event\\user_created',
		component: 'core',
		action: 'created',
		target: 'user',
		objecttable: 'user',
		objectid: 1,
		crud: 'c',
		edulevel: 2,
		contextid: 1,
		contextlevel: 10,
		contextinstanceid: 0,
		userid: 1,
		courseid: 0,
		anonymous: 0,
		other: {},
		timecreated: Math.floor(Date.now() / 1000),
		host: 'test',
		token: 't',
		extra: 'x',
	};

	const samplePayload: WebhookPayload = {
		token: 't',
		events: [sampleEvent],
		site: { id: '1', url: 'http://test', name: 'Test', version: '4.0' },
	};

	it('DirectProcessingStrategy calls handler when present', async () => {
		const handler = jest.fn(async (_e: WebhookEvent, _p: WebhookPayload) =>
			Promise.resolve(),
		);

		const handlerMapper = {
			getHandler: (_: string) => handler,
			hasHandler: (_: string) => true,
		} as unknown as IEventHandlerMapper;

		const direct = new DirectProcessingStrategy(handlerMapper);

		await direct.process(sampleEvent, samplePayload);

		expect(handler).toHaveBeenCalledTimes(1);
	});

	it('QueueProcessingStrategy publishes event when queue is connected and supported', async () => {
		const publish = jest.fn(async (_e: WebhookEvent) => Promise.resolve());

		const mockQueue = {
			isConnected: true,
			publishEvent: publish,
			isEventSupported: (_: string) => true,
		} as unknown as IEventQueue;

		const queueStrategy = new QueueProcessingStrategy(mockQueue);

		await queueStrategy.process(sampleEvent, samplePayload);

		expect(publish).toHaveBeenCalledTimes(1);
	});

	it('HybridProcessingStrategy prefers queue when available and falls back to direct', async () => {
		const handler = jest.fn(async () => Promise.resolve());
		const handlerMapper = {
			getHandler: (_: string) => handler,
			hasHandler: (_: string) => true,
		} as unknown as IEventHandlerMapper;

		// Case A: queue available and supports event -> should publish, not call handler
		const publish = jest.fn(async (_e: WebhookEvent) => Promise.resolve());
		const mockQueueA = {
			isConnected: true,
			publishEvent: publish,
			isEventSupported: (_: string) => true,
		} as unknown as IEventQueue;

		const hybridA = new HybridProcessingStrategy(handlerMapper, mockQueueA);
		await hybridA.process(sampleEvent, samplePayload);

		expect(publish).toHaveBeenCalledTimes(1);
		expect(handler).toHaveBeenCalledTimes(0);

		// Case B: queue not available -> should call direct handler
		const mockQueueB = {
			isConnected: false,
			publishEvent: jest.fn(),
			isEventSupported: (_: string) => false,
		} as unknown as IEventQueue;

		const hybridB = new HybridProcessingStrategy(handlerMapper, mockQueueB);
		await hybridB.process(sampleEvent, samplePayload);

		expect(handler).toHaveBeenCalledTimes(1);
	});
});

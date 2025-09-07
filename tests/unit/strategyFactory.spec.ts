import type { IEventHandlerMapper } from '../../src/interfaces/EventInterfaces';
import {
	createProcessingStrategy,
	getRecommendedProcessingMode,
} from '../../src/strategies/EventProcessingStrategyFactory';

describe('Processing strategy factory', () => {
	it('recommends direct when no queue present', () => {
		expect(getRecommendedProcessingMode(false, false)).toBe('direct');
	});

	it('recommends hybrid when queue exists and is connected', () => {
		expect(getRecommendedProcessingMode(true, true)).toBe('hybrid');
	});

	it('recommends direct when queue exists but not connected', () => {
		expect(getRecommendedProcessingMode(true, false)).toBe('direct');
	});

	it('createProcessingStrategy throws when queue mode requested without queue', () => {
		expect(() =>
			createProcessingStrategy('queue', {} as IEventHandlerMapper, undefined),
		).toThrow();
	});
});

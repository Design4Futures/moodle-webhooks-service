import { InvalidConfigurationError } from '../errors';
import type { IEventHandler, IEventQueue } from '../interfaces/EventInterfaces';
import { DirectProcessingStrategy } from './DirectProcessingStrategy';
import { EventProcessingContext } from './EventProcessingContext';
import { HybridProcessingStrategy } from './HybridProcessingStrategy';
import { QueueProcessingStrategy } from './QueueProcessingStrategy';

export type ProcessingMode = 'direct' | 'queue' | 'hybrid';

export function createProcessingStrategy(
	mode: ProcessingMode,
	handlerMap: Map<string, IEventHandler>,
	eventQueue?: IEventQueue,
): EventProcessingContext {
	switch (mode) {
		case 'direct':
			return new EventProcessingContext(
				new DirectProcessingStrategy(handlerMap),
			);

		case 'queue':
			if (!eventQueue) {
				throw new InvalidConfigurationError(
					'eventQueue',
					'IEventQueue instance',
					{
						mode,
						reason: 'Event queue is required for queue processing mode',
					},
				);
			}
			return new EventProcessingContext(
				new QueueProcessingStrategy(eventQueue),
			);

		case 'hybrid':
			return new EventProcessingContext(
				new HybridProcessingStrategy(handlerMap, eventQueue),
			);

		default:
			throw new InvalidConfigurationError(
				'processingMode',
				'direct | queue | hybrid',
				{
					providedMode: mode,
					validModes: ['direct', 'queue', 'hybrid'],
				},
			);
	}
}

export function getRecommendedProcessingMode(
	hasQueue: boolean,
	queueConnected: boolean,
): ProcessingMode {
	if (!hasQueue) {
		return 'direct';
	}

	if (hasQueue && queueConnected) {
		return 'hybrid';
	}

	return 'direct';
}

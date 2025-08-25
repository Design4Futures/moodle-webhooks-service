import type { MoodleEventHandlers } from '../handlers/MoodleEventHandler';
import type {
	IEventHandler,
	IEventHandlerMapper,
} from '../interfaces/EventInterfaces';
import type { EventHandler } from '../types/eventhandler';
import { EventRegistry, type MoodleEventType } from './EventRegistry';

export class EventHandlerMapper implements IEventHandlerMapper {
	private handlerMap: Map<MoodleEventType, EventHandler> = new Map();

	constructor(handlers: MoodleEventHandlers) {
		this.setupHandlerMapping(handlers);
	}

	private setupHandlerMapping(handlers: MoodleEventHandlers): void {
		const supported = EventRegistry.getInstance().getSupportedEventNames();

		for (const eventName of supported) {
			const raw = (eventName.split('\\').pop() || eventName).replace(
				/[^a-z0-9_]/gi,
				'',
			);
			const parts = raw.split('_').filter(Boolean);
			const methodName = parts
				.map((p, i) => (i === 0 ? p : p.charAt(0).toUpperCase() + p.slice(1)))
				.join('');

			const maybeHandler = (handlers as unknown as Record<string, unknown>)[
				methodName
			];
			if (typeof maybeHandler === 'function') {
				this.handlerMap.set(
					eventName as MoodleEventType,
					maybeHandler as EventHandler,
				);
			}
		}
	}

	getHandler(eventName: string): IEventHandler | undefined {
		return this.handlerMap.get(eventName as MoodleEventType);
	}

	getSupportedEvents(): string[] {
		return Array.from(this.handlerMap.keys());
	}

	getAllHandlers(): Array<{
		eventName: MoodleEventType;
		handler: EventHandler;
	}> {
		return Array.from(this.handlerMap.entries()).map(
			([eventName, handler]) => ({
				eventName,
				handler,
			}),
		);
	}

	hasHandler(eventName: string): boolean {
		return this.handlerMap.has(eventName as MoodleEventType);
	}

	registerHandler(eventName: MoodleEventType, handler: EventHandler): void {
		this.handlerMap.set(eventName, handler);
	}

	getHandlerCount(): number {
		return this.handlerMap.size;
	}
}

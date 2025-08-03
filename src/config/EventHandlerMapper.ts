import type { MoodleEventHandlers } from '../handlers/MoodleEventHandler';
import type {
	IEventHandler,
	IEventHandlerMapper,
} from '../interfaces/EventInterfaces';
import type { EventHandler } from '../types/eventhandler';
import { MOODLE_EVENTS, type MoodleEventType } from './EventRegistry';

export class EventHandlerMapper implements IEventHandlerMapper {
	private handlerMap: Map<MoodleEventType, EventHandler> = new Map();

	constructor(handlers: MoodleEventHandlers) {
		this.setupHandlerMapping(handlers);
	}

	private setupHandlerMapping(handlers: MoodleEventHandlers): void {
		this.handlerMap.set(MOODLE_EVENTS.USER_CREATED, handlers.userCreated);
		this.handlerMap.set(
			MOODLE_EVENTS.COURSE_COMPLETED,
			handlers.courseCompleted,
		);
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

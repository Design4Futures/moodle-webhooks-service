import type { IEventHandler } from './IEventHandler';

export interface IEventHandlerMapper {
	getHandler(eventName: string): IEventHandler | undefined;
	hasHandler(eventName: string): boolean;
	getSupportedEvents(): string[];
}

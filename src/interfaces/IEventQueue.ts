import type { WebhookEvent } from '../types/webhook';

export interface IEventQueue {
	readonly isConnected: boolean;
	publishEvent(event: WebhookEvent): Promise<void>;
	isEventSupported(eventName: string): boolean;
}

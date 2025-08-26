import type { WebhookEvent, WebhookPayload } from '../types/webhook';

export interface IEventQueue {
	readonly isConnected: boolean;
	publishEvent(event: WebhookEvent, payload?: WebhookPayload): Promise<void>;
	isEventSupported(eventName: string): boolean;
}

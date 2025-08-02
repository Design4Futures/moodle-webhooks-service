import type { WebhookEvent, WebhookPayload } from '../types/webhook';

export interface IEventProcessingStrategy {
	process(event: WebhookEvent, payload?: WebhookPayload): Promise<void>;
	shouldProcess(event: WebhookEvent): boolean;
}

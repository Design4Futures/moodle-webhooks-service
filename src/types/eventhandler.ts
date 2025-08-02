import type { WebhookEvent, WebhookPayload } from './webhook';

export type EventHandler = (
	event: WebhookEvent,
	payload: WebhookPayload,
) => Promise<void> | void;

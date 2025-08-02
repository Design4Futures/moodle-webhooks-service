import type { WebhookEvent, WebhookPayload } from '../types/webhook';

export type IEventHandler = (
	event: WebhookEvent,
	payload: WebhookPayload,
) => Promise<void> | void;

import { MoodleClient } from '../lib/MoodleClient';
import type { MoodleConfig } from '../types/moodle';
import type { WebhookEvent, WebhookPayload } from '../types/webhook';

export class WebhookService {
	private moodleClient: MoodleClient;

	constructor(config: MoodleConfig) {
		this.moodleClient = new MoodleClient(config);
	}

	public async process(
		payload: WebhookPayload,
		enabledEvents: string[],
	): Promise<void> {
		for (const event of payload.events)
			if (enabledEvents.includes(event.eventname))
				await this.handleEvent(event);
	}

	private async handleEvent(event: WebhookEvent): Promise<void> {
		switch (event.eventname) {
			case '\\core\\event\\user_created':
				console.log(
					`User created with ID: ${event.userid}. Full event data:`,
					event,
				);
				break;

			case '\\core\\event\\course_created':
				console.log(
					`Course created with ID: ${event.courseid}. Full event data:`,
					event,
				);
				break;

			case '\\core\\event\\user_enrolment_created':
				console.log(
					`User ${event.relateduserid} enrolled in course ${event.courseid}.`,
				);
				break;

			default:
				console.log(`No specific handler for event: ${event.eventname}`);
				break;
		}
	}
}

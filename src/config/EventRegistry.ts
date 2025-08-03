export interface EventConfig {
	eventName: string;
	queueName: string;
	routingKey: string;
	priority: number;
	retries: number;
	ttl: number; //* milliseconds
	description: string;
}

export const MOODLE_EVENTS = {
	USER_CREATED: '\\core\\event\\user_created',
	COURSE_COMPLETED: '\\core\\event\\course_completed',
} as const;

export type MoodleEventType =
	(typeof MOODLE_EVENTS)[keyof typeof MOODLE_EVENTS];

export class EventRegistry {
	private static instance: EventRegistry;
	private events: Map<string, EventConfig> = new Map();

	private constructor() {
		this.registerDefaultEvents();
	}

	static getInstance(): EventRegistry {
		if (!EventRegistry.instance) {
			EventRegistry.instance = new EventRegistry();
		}
		return EventRegistry.instance;
	}

	private registerDefaultEvents(): void {
		this.registerEvent({
			eventName: MOODLE_EVENTS.USER_CREATED,
			queueName: 'webhook.user.created',
			routingKey: 'user.created',
			priority: 8,
			retries: 3,
			ttl: 300000, //* 5 minutes
			description: 'User creation events',
		});

		this.registerEvent({
			eventName: MOODLE_EVENTS.COURSE_COMPLETED,
			queueName: 'webhook.course.completed',
			routingKey: 'course.completed',
			priority: 9,
			retries: 5,
			ttl: 600000, //* 10 minutes
			description: 'Course completion events',
		});
	}

	registerEvent(config: EventConfig): void {
		this.events.set(config.eventName, config);
	}

	getEventConfig(eventName: string): EventConfig | undefined {
		return this.events.get(eventName);
	}

	getAllEvents(): EventConfig[] {
		return Array.from(this.events.values());
	}

	getEventNames(): string[] {
		return Array.from(this.events.keys());
	}

	getSupportedEventNames(): MoodleEventType[] {
		return Object.values(MOODLE_EVENTS);
	}

	isEventSupported(eventName: string): boolean {
		return this.events.has(eventName);
	}

	getEnabledEvents(): string[] {
		return Array.from(this.events.keys());
	}

	isEventEnabled(eventName: string): boolean {
		return this.isEventSupported(eventName);
	}

	getDefaultEventConfig(): EventConfig {
		return {
			eventName: 'default',
			queueName: 'webhook.events.default',
			routingKey: 'events.default',
			priority: 5,
			retries: 2,
			ttl: 300000, //* 5 minutes
			description: 'Default configuration for unsupported events',
		};
	}
}

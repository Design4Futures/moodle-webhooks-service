export interface WebhookConfig {
	port: number;
	host?: string;
	path: string;
	secret: string;
	moodleUrl: string;
	enabledEvents: string[];
	rateLimiting?: {
		max: number;
		timeWindow: number;
	};
}

export interface WebhookPayload {
	token: string;
	events: WebhookEvent[];
	site: {
		id: string;
		url: string;
		name: string;
		version: string;
	};
}

export interface WebhookEvent {
	eventname: string;
	component: string;
	action: string;
	target: string;
	objecttable: string;
	objectid: number;
	crud: 'c' | 'r' | 'u' | 'd';
	edulevel: number;
	contextid: number;
	contextlevel: number;
	contextinstanceid: number;
	userid: number;
	courseid?: number;
	relateduserid?: number;
	anonymous: number;
	other: Record<string, any>;
	timecreated: number;
	origin: string;
	ip: string;
	realuserid?: number;
}

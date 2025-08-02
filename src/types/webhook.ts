export interface WebhookConfig {
	port: number;
	host?: string | undefined;
	path: string;
	secret: string;
	moodleUrl: string;
	enabledEvents: string[];
	rateLimiting?:
		| {
				max: number;
				timeWindow: number;
		  }
		| undefined;
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
	objectid: number | string;
	crud: 'c' | 'r' | 'u' | 'd';
	edulevel: number;
	contextid: number;
	contextlevel: number;
	contextinstanceid: number | string;
	userid: number | string;
	courseid?: number;
	relateduserid?: number | string;
	anonymous: number;
	other: Record<string, unknown> | null;
	timecreated: number;
	host: string;
	token: string;
	extra: string;
}

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

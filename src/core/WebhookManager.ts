/** biome-ignore-all lint/style/noNonNullAssertion: <any> */

import dotenv from 'dotenv';
import { MoodleEventHandlers } from '../handlers/MoodleEventHandler';
import { MoodleClient } from '../lib/MoodleClient';
import type { WebhookConfig } from '../types/webhook';
import { MoodleWebhookServer } from './MoodleWebhookServer';

class WebhookManager {
	private server: MoodleWebhookServer;
	private handlers: MoodleEventHandlers;

	constructor(webhookConfig: WebhookConfig, moodleClient: MoodleClient) {
		this.server = new MoodleWebhookServer(webhookConfig);
		this.handlers = new MoodleEventHandlers(moodleClient);
		this.setupEventHandlers();
	}

	private setupEventHandlers(): void {
		this.server.on('\\core\\event\\user_created', this.handlers.userCreated);
		this.server.on('\\core\\event\\user_loggedin', this.handlers.userLoggedIn);
		this.server.on(
			'\\core\\event\\user_enrolment_created',
			this.handlers.userEnrolled,
		);
		this.server.on(
			'\\core\\event\\course_completed',
			this.handlers.courseCompleted,
		);
		this.server.on(
			'\\mod_assign\\event\\assessable_submitted',
			this.handlers.assignmentSubmitted,
		);
		this.server.on(
			'\\mod_quiz\\event\\attempt_submitted',
			this.handlers.quizAttemptFinished,
		);
		this.server.onAny(async (event, payload) => {
			console.log(`Event received: ${event.eventname} - User: ${event.userid}`);

			await this.saveEventForAnalytics(event, payload);
		});
	}

	private async saveEventForAnalytics(
		_event: any,
		_payload: any,
	): Promise<void> {
		//TODO: Implementar salvamento em banco de dados
		console.log('Event saved for analytics');
	}

	async start(): Promise<void> {
		await this.server.start();
	}

	async stop(): Promise<void> {
		await this.server.stop();
	}

	addHandler(eventName: string, handler: any): void {
		this.server.on(eventName, handler);
	}

	//* Getter para acessar servidor
	get instance(): MoodleWebhookServer {
		return this.server;
	}
}

export async function main() {
	const webhookConfig: WebhookConfig = {
		port: Number.parseInt(process.env.WEBHOOK_PORT || '3333'),
		host: process.env.WEBHOOK_HOST || '0.0.0.0',
		path: process.env.WEBHOOK_PATH || '/webhook/moodle',
		secret: process.env.MOODLE_TOKEN!,
		moodleUrl: process.env.MOODLE_BASE_URL!,
		enabledEvents: [
			'\\core\\event\\course_created',
			'\\core\\event\\user_created',
			'\\core\\event\\user_enrolment_created',
			'\\core\\event\\course_completed',
		],
		rateLimiting: {
			max: Number.parseInt(process.env.RATE_LIMIT || '1000'),
			timeWindow: Number.parseInt(
				process.env.RATE_LIMIT_TIME_WINDOW || '60000', //* Default: 1 minute
			),
		},
	};

	const moodleClient = new MoodleClient({
		baseUrl: process.env.MOODLE_BASE_URL!,
		token: process.env.MOODLE_TOKEN!,
	});

	const webhookManager = new WebhookManager(webhookConfig, moodleClient);

	// Adicionar handlers customizados
	// webhookManager.addHandler(
	// 	'\\core\\event\\course_viewed',
	// 	async (event: { courseid: any; userid: any }) => {
	// 		console.log(`Course viewed: ${event.courseid} by user ${event.userid}`);
	// 	},
	// );

	try {
		await webhookManager.start();

		// Graceful shutdown
		const gracefulShutdown = async (signal: string) => {
			console.log(`Received ${signal}, stopping server...`);
			try {
				await webhookManager.stop();
				console.log('Server stopped successfully');
				process.exit(0);
			} catch (error) {
				console.error('Error stopping server:', error);
				process.exit(1);
			}
		};

		process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
		process.on('SIGINT', () => gracefulShutdown('SIGINT'));
	} catch (error) {
		console.error('Error starting webhook system:', error);
		process.exit(1);
	}
}

if (require.main === module) {
	dotenv.config();
	main();
}

export { WebhookManager, MoodleWebhookServer, MoodleEventHandlers };

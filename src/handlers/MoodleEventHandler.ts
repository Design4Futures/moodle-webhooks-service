/** biome-ignore-all lint/suspicious/noExplicitAny: <any> */
/** biome-ignore-all lint/style/noNonNullAssertion: <any> */
import { EventHandlerExecutionError } from '../errors';
import type { MoodleClient } from '../lib/MoodleClient';
import type { ServiceClient } from '../lib/ServiceClient';
import { executeWithRetry } from '../services/Retry';
import type { EventHandler } from '../types/eventhandler';
import type { WebhookEvent } from '../types/webhook';

export class MoodleEventHandlers {
	constructor(
		private moodleClient: MoodleClient,
		private serviceClient: ServiceClient,
	) {}

	userCreated: EventHandler = async (event: WebhookEvent) => {
		const result = await executeWithRetry(
			async () => {
				const user = await this.moodleClient.getUserById(event.objectid);
				await this.serviceClient.createUserProfile(user);
			},
			{
				maxAttempts: 3,
				retryCondition: (error) =>
					!error.message.includes('authentication') &&
					!error.message.includes('not found'),
			},
		);

		if (!result.success) {
			throw new EventHandlerExecutionError(
				'user_created',
				'MoodleEventHandlers.userCreated',
				result.error || new Error('Max retries exceeded'),
				{
					eventName: event.eventname,
					userId: event.objectid,
					timestamp: event.timecreated,
					attempts: result.attempts,
					totalTime: result.totalTime,
				},
			);
		}
	};

	courseCreated: EventHandler = async (event: WebhookEvent) => {
		const result = await executeWithRetry(
			async () => {
				await this.serviceClient.createCourseProfile(event);
			},
			{
				maxAttempts: 3,
				baseDelay: 2000,
				retryCondition: (error) => !error.message.includes('authentication'),
			},
		);
		if (!result.success) {
			throw new EventHandlerExecutionError(
				'course_created',
				'MoodleEventHandlers.courseCreated',
				result.error || new Error('Max retries exceeded'),
				{
					eventName: event.eventname,
					courseId: event.objectid,
					timestamp: event.timecreated,
					attempts: result.attempts,
					totalTime: result.totalTime,
				},
			);
		}
	};

	//TODO: course-completed implements
	courseCompleted: EventHandler = async (event: WebhookEvent) => {
		const result = await executeWithRetry(
			async () => {
				console.log(`Curso concluído pelo usuário ${event.userid}`);

				const [user, course] = await Promise.all([
					this.moodleClient.getUserById(event.userid),
					this.moodleClient.getCourseById(event.courseid!),
				]);

				await Promise.all([
					this.generateCertificate(user, course),
					this.updateExternalProgress(user, course, 'completed'),
					this.triggerNextCourseRecommendation(user, course),
				]);
			},
			{
				maxAttempts: 5,
				baseDelay: 2000,
				retryCondition: (error) => !error.message.includes('authentication'),
			},
		);

		if (!result.success) {
			throw new EventHandlerExecutionError(
				'course_completed',
				'MoodleEventHandlers.courseCompleted',
				result.error || new Error('Max retries exceeded'),
				{
					eventName: event.eventname,
					userId: event.userid,
					courseId: event.courseid,
					timestamp: event.timecreated,
					attempts: result.attempts,
					totalTime: result.totalTime,
				},
			);
		}
	};

	private async generateCertificate(
		user: unknown,
		_course: unknown,
	): Promise<void> {
		console.log(`Certificado gerado para ${JSON.stringify(user)}`);

		//TODO: Logica para geracao das microcredenciais
	}

	private async updateExternalProgress(
		_user: unknown,
		_course: unknown,
		status: string,
	): Promise<void> {
		console.log(`Progresso atualizado no sistema externo: ${status}`);
	}

	private async triggerNextCourseRecommendation(
		user: unknown,
		_course: unknown,
	): Promise<void> {
		console.log(
			`Recomendações de próximos cursos para ${JSON.stringify(user)}`,
		);
	}
}

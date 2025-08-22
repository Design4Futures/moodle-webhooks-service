/** biome-ignore-all lint/suspicious/noExplicitAny: <any> */
/** biome-ignore-all lint/style/noNonNullAssertion: <any> */
import { EventHandlerExecutionError } from '../errors';
import type { MoodleClient } from '../lib/MoodleClient';
import type { ServiceClient } from '../lib/ServiceClient';
import type { EventHandler } from '../types/eventhandler';
import type { WebhookEvent } from '../types/webhook';

export class MoodleEventHandlers {
	constructor(
		private moodleClient: MoodleClient,
		private serviceClient: ServiceClient,
	) {}

	userCreated: EventHandler = async (event: WebhookEvent) => {
		console.log(`Novo usuário criado: ID ${event.objectid}`);

		try {
			//* Buscar os dados do usuario criado no Moodle
			const user = await this.moodleClient.getUserById(event.objectid);

			//* Integração com serviços externos
			await this.serviceClient.createUserProfile(user);
		} catch (error) {
			throw new EventHandlerExecutionError(
				'user_created',
				'MoodleEventHandlers.userCreated',
				error instanceof Error ? error : new Error('Unknown error'),
				{
					eventName: event.eventname,
					userId: event.objectid,
					timestamp: event.timecreated,
				},
			);
		}
	};

	//TODO: course-completed implements
	courseCompleted: EventHandler = async (event: WebhookEvent) => {
		console.log(`Curso concluído pelo usuário ${event.userid}`);

		try {
			const [user, course] = await Promise.all([
				this.moodleClient.getUserById(event.userid),
				this.moodleClient.getCourseById(event.courseid!),
			]);

			//* Processar conclusão
			await Promise.all([
				this.generateCertificate(user, course),
				this.updateExternalProgress(user, course, 'completed'),
				this.triggerNextCourseRecommendation(user, course),
			]);
		} catch (error) {
			throw new EventHandlerExecutionError(
				'course_completed',
				'MoodleEventHandlers.courseCompleted',
				error instanceof Error ? error : new Error('Unknown error'),
				{
					eventName: event.eventname,
					userId: event.userid,
					courseId: event.courseid,
					timestamp: event.timecreated,
				},
			);
		}
	};

	// private async syncToExternalSystem(
	// 	_user: unknown,
	// 	_course: unknown,
	// 	action: string,
	// ): Promise<void> {
	// }

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

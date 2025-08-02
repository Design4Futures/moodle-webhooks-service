/** biome-ignore-all lint/suspicious/noExplicitAny: <any> */
/** biome-ignore-all lint/style/noNonNullAssertion: <any> */
import type { MoodleClient } from '../lib/MoodleClient';
import type { EventHandler } from '../types/eventhandler';
import type { WebhookEvent } from '../types/webhook';

export class MoodleEventHandlers {
	constructor(private moodleClient: MoodleClient) {}

	// TODO: create-user event implements
	userCreated: EventHandler = async (event: WebhookEvent) => {
		console.log(`Novo usuário criado: ID ${event.objectid}`);

		try {
			const user = await this.moodleClient.getUserById(event.objectid);
			console.log(`Processando boas-vindas para ${user.email}`);

			//* Integração com serviços externos
			await Promise.all([
				this.sendWelcomeEmail(user),
				this.createUserProfile(user),
				this.notifyAdmins(user),
			]);
		} catch (error) {
			console.error('Erro ao processar criação de usuário:', error);
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
			console.error('Erro ao processar conclusão do curso:', error);
		}
	};

	private async sendWelcomeEmail(user: any): Promise<void> {
		console.log(`Email de boas-vindas enviado para ${user.email}`);
		//TODO: Implementar integração com SendGrid, AWS SES, etc.
	}

	private async createUserProfile(user: any): Promise<void> {
		console.log(`Perfil criado para ${user.username}`);
		//TODO: Criar perfil em sistema externo
	}

	private async notifyAdmins(user: any): Promise<void> {
		console.log(`Admins notificados sobre novo usuário: ${user.username}`);
	}

	// private async syncToExternalSystem(
	// 	_user: any,
	// 	_course: any,
	// 	action: string,
	// ): Promise<void> {
	// }

	private async generateCertificate(user: any, _course: any): Promise<void> {
		console.log(`Certificado gerado para ${user.firstname} ${user.lastname}`);

		//TODO: Logica para geracao das microcredenciais
	}

	private async updateExternalProgress(
		_user: any,
		_course: any,
		status: string,
	): Promise<void> {
		console.log(`Progresso atualizado no sistema externo: ${status}`);
	}

	private async triggerNextCourseRecommendation(
		user: any,
		_course: any,
	): Promise<void> {
		console.log(`Recomendações de próximos cursos para ${user.username}`);
	}
}

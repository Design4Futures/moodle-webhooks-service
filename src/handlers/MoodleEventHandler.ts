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

	//TODO: user-login event implements
	userLoggedIn: EventHandler = async (event: WebhookEvent) => {
		console.log(`Usuário logado: ID ${event.userid}`);

		try {
			const user = await this.moodleClient.getUserById(event.userid);
			console.log(`Login processado para ${user.email}`);

			//* Registrar análise de comportamento
			await this.logUserActivity(user, 'login');
		} catch (error) {
			console.error('Erro ao processar login do usuário:', error);
		}
	};

	//TODO: user-enrolment event implements
	userEnrolled: EventHandler = async (event: WebhookEvent) => {
		console.log(`Usuário matriculado: ID ${event.userid} no curso ${event.courseid}`,
		);

		try {
			const [user, course] = await Promise.all([
				this.moodleClient.getUserById(event.userid),
				this.moodleClient.getCourseById(event.courseid!),
			]);

			//* Processar matrícula
			await Promise.all([
				this.sendEnrolmentEmail(user, course),
				this.updateExternalProgress(user, course, 'enrolled'),
			]);
		} catch (error) {
			console.error('Erro ao processar matrícula do usuário:', error);
		}
	};

	//TODO: assignment-submitted event implements
	assignmentSubmitted: EventHandler = async (event: WebhookEvent) => {
		console.log(`Atividade submetida pelo usuário ${event.userid}`);

		try {
			const user = await this.moodleClient.getUserById(event.userid);
			console.log(`Processando submissão de atividade para ${user.email}`);

			//* Processar submissão
			await this.processAssignmentSubmission(user, event);
		} catch (error) {
			console.error('Erro ao processar submissão de atividade:', error);
		}
	};

	//TODO: quiz-attempt event implements
	quizAttemptFinished: EventHandler = async (event: WebhookEvent) => {
		console.log(`Quiz finalizado pelo usuário ${event.userid}`);

		try {
			const user = await this.moodleClient.getUserById(event.userid);
			console.log(`Processando attempt de quiz para ${user.email}`);

			//* Processar attempt de quiz
			await this.processQuizAttempt(user, event);
		} catch (error) {
			console.error('Erro ao processar attempt de quiz:', error);
		}
	};

	private async sendWelcomeEmail(user: unknown): Promise<void> {
		console.log(`Email de boas-vindas enviado para ${JSON.stringify(user)}`);
		//TODO: Implementar integração com SendGrid, AWS SES, etc.
	}

	private async createUserProfile(user: unknown): Promise<void> {
		console.log(`Perfil criado para ${JSON.stringify(user)}`);
		//TODO: Criar perfil em sistema externo
	}

	private async notifyAdmins(user: unknown): Promise<void> {
		console.log(`Admins notificados sobre novo usuário: ${JSON.stringify(user)}`,
		);
	}

	private async logUserActivity(
		user: unknown,
		activity: string,
	): Promise<void> {
		console.log(`Atividade registrada: ${activity} para ${JSON.stringify(user)}`,
		);
		//TODO: Implementar análise de comportamento
	}

	private async sendEnrolmentEmail(
		user: unknown,
		course: unknown,
	): Promise<void> {
		console.log(`Email de matrícula enviado para ${JSON.stringify(user)} no curso ${JSON.stringify(course)}`,
		);
		//TODO: Implementar email de matrícula
	}

	private async processAssignmentSubmission(
		user: unknown,
		event: WebhookEvent,
	): Promise<void> {
		console.log(`Processando submissão de atividade para ${JSON.stringify(user)}, evento: ${event.eventname}`,
		);
		//TODO: Implementar processamento de submissão
	}

	private async processQuizAttempt(
		user: unknown,
		event: WebhookEvent,
	): Promise<void> {
		console.log(`Processando attempt de quiz para ${JSON.stringify(user)}, evento: ${event.eventname}`,
		);
		//TODO: Implementar processamento de quiz
	}

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
		console.log(`Recomendações de próximos cursos para ${JSON.stringify(user)}`,
		);
	}
}

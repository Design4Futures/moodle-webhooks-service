import dotenv from 'dotenv';
import { MissingConfigurationError, QueueConnectionError } from '../errors';
import { RabbitMQService } from '../services/RabbitMQService';

dotenv.config();

const cleanupQueues = async () => {
	if (!process.env.RABBITMQ_URL) {
		throw new MissingConfigurationError(['RABBITMQ_URL'], {
			component: 'cleanupQueues',
			reason: 'RABBITMQ_URL is required for queue cleanup',
		});
	}

	console.log('Limpando filas do RabbitMQ...');

	const rabbitmq = new RabbitMQService({
		url: process.env.RABBITMQ_URL,
		exchangeName: process.env.RABBITMQ_EXCHANGE || 'webhook.events',
	});

	try {
		await rabbitmq.connect();
		console.log('Conectado ao RabbitMQ');

		const queues = [
			'webhook.user.created',
			'webhook.user.login',
			'webhook.user.enrolment',
			'webhook.course.completed',
			'webhook.assignment.submitted',
			'webhook.quiz.submitted',
			'webhook.events.default',
			// Filas de retry
			'webhook.user.created.retry',
			'webhook.user.login.retry',
			'webhook.user.enrolment.retry',
			'webhook.course.completed.retry',
			'webhook.assignment.submitted.retry',
			'webhook.quiz.submitted.retry',
		];

		for (const queueName of queues) {
			try {
				const service = rabbitmq as unknown as {
					channel?: { purgeQueue: (queue: string) => Promise<void> };
				};
				await service.channel?.purgeQueue(queueName);
				console.log(`️Fila ${queueName} limpa`);
			} catch {
				console.log(`️Fila ${queueName} não encontrada ou já limpa`);
			}
		}

		await rabbitmq.disconnect();
		console.log(' Limpeza concluída');
	} catch (error) {
		throw new QueueConnectionError('Erro durante limpeza das filas', {
			originalError: error instanceof Error ? error.message : 'Unknown error',
			component: 'cleanupQueues',
		});
	} finally {
		try {
			await rabbitmq.disconnect();
		} catch (disconnectError) {
			console.warn('Warning during disconnect:', disconnectError);
		}
	}
};

if (require.main === module) {
	cleanupQueues();
}

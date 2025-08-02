import dotenv from 'dotenv';
import { WebhookEventQueue } from '../services/WebhookEventQueue';
import type { WebhookEvent } from '../types/webhook';

dotenv.config();

const testRabbitMQIntegration = async () => {
	if (!process.env.RABBITMQ_URL || !process.env.RABBITMQ_EXCHANGE) {
		console.error(' Configuração do RabbitMQ não encontrada');
		console.log('Configure RABBITMQ_URL e RABBITMQ_EXCHANGE no arquivo .env');
		process.exit(1);
	}

	console.log('Testando integração RabbitMQ...');

	const eventQueue = new WebhookEventQueue({
		url: process.env.RABBITMQ_URL,
		exchangeName: process.env.RABBITMQ_EXCHANGE,
	});

	try {
		//* Connect ao RabbitMQ
		await eventQueue.initialize();
		console.log('Conectado ao RabbitMQ');

		//* Evento de teste
		const testEvent: WebhookEvent = {
			eventname: '\\core\\event\\user_created',
			component: 'core',
			action: 'created',
			target: 'user',
			objecttable: 'user',
			objectid: 123,
			crud: 'c',
			edulevel: 0,
			contextid: 1,
			contextlevel: 10,
			contextinstanceid: 0,
			userid: 123,
			courseid: 1,
			relateduserid: 0,
			anonymous: 0,
			other: {
				username: 'testuser',
				email: 'test@example.com',
			},
			timecreated: Date.now() / 1000,
			host: 'localhost',
			token: 'test-token',
			extra: '',
		};

		//* Publicar evento de teste
		console.log('Publicando evento de teste...');
		await eventQueue.publishEvent(testEvent);
		console.log('Evento publicado com sucesso');

		//* Aguardar um pouco e verificar estatísticas
		await new Promise((resolve) => setTimeout(resolve, 2000));

		const stats = await eventQueue.getQueueStats();
		console.log('Estatísticas das filas:', stats);

		//* Encerrar conexão
		await eventQueue.shutdown();
		console.log('Teste concluído com sucesso');
	} catch (error) {
		console.error('Erro durante o teste:', error);
		await eventQueue.shutdown();
		process.exit(1);
	}
};

const testEventProcessing = async () => {
	if (!process.env.RABBITMQ_URL || !process.env.RABBITMQ_EXCHANGE) {
		console.error('Configuração do RabbitMQ não encontrada');
		process.exit(1);
	}

	console.log('Testando processamento de eventos...');

	const eventQueue = new WebhookEventQueue({
		url: process.env.RABBITMQ_URL,
		exchangeName: process.env.RABBITMQ_EXCHANGE,
	});

	try {
		await eventQueue.initialize();
		console.log('Conectado ao RabbitMQ');

		//* Configurar consumer de teste
		await eventQueue.consumeEvents(
			'\\core\\event\\user_created',
			async (event) => {
				console.log(' Evento recebido:', {
					eventname: event.eventname,
					userid: event.userid,
					messageId: event.messageId,
					publishedAt: event.publishedAt,
				});

				//* Simular processamento
				await new Promise((resolve) => setTimeout(resolve, 1000));

				console.log('Evento processed successfully');
			},
		);

		console.log('Aguardando eventos... (Ctrl+C para parar)');

		//* Manter o processo vivo
		await new Promise(() => {});
	} catch (error) {
		console.error('Erro durante o teste:', error);
		await eventQueue.shutdown();
		process.exit(1);
	}
};

const main = async () => {
	const args = process.argv.slice(2);
	const command = args[0] || 'publish';

	switch (command) {
		case 'publish':
			await testRabbitMQIntegration();
			break;
		case 'consume':
			await testEventProcessing();
			break;
		default:
			console.log('Uso:');
			console.log(
				'npm run test:rabbitmq publish  - Testa publicação de eventos',
			);
			console.log('npm run test:rabbitmq consume  - Testa consumo de eventos');
			break;
	}
};

if (require.main === module) {
	main().catch(console.error);
}

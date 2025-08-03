/** biome-ignore-all lint/suspicious/noExplicitAny: <any> */
import * as amqp from 'amqplib';
import {
	QueueConnectionError,
	QueueCreationError,
	QueuePublishError,
} from '../errors';
import type { WebhookEvent } from '../types/webhook';

export interface RabbitMQConfig {
	url: string;
	exchangeName: string;
	retryAttempts?: number;
	retryDelay?: number;
}

export interface MessageOptions {
	persistent?: boolean;
	priority?: number;
	expiration?: string;
	headers?: Record<string, unknown>;
}

export class RabbitMQService {
	private connection: any = null;
	private channel: any = null;
	private config: RabbitMQConfig;
	private isConnected = false;

	constructor(config: RabbitMQConfig) {
		this.config = {
			retryAttempts: 3,
			retryDelay: 5000,
			...config,
		};
	}

	async connect(): Promise<void> {
		try {
			console.log('Connecting to RabbitMQ...');
			this.connection = await amqp.connect(this.config.url);
			this.channel = await this.connection.createChannel();

			//* Setup do exchange principal
			await this.channel?.assertExchange(this.config.exchangeName, 'topic', {
				durable: true,
			});

			//* Setup de dead letter exchange para mensagens com falha
			await this.channel?.assertExchange(
				`${this.config.exchangeName}.dlx`,
				'topic',
				{ durable: true },
			);

			//* Configurar listeners para reconexão automática
			this.connection?.on('error', this.handleConnectionError.bind(this));
			this.connection?.on('close', this.handleConnectionClose.bind(this));

			this.isConnected = true;
			console.log('Conectado ao RabbitMQ com sucesso');
		} catch (error) {
			throw new QueueConnectionError('Erro ao conectar ao RabbitMQ', {
				url: this.config.url,
				exchangeName: this.config.exchangeName,
				originalError: error instanceof Error ? error.message : 'Unknown error',
			});
		}
	}

	async disconnect(): Promise<void> {
		try {
			if (this.channel) {
				await this.channel.close();
			}
			if (this.connection) {
				await this.connection.close();
			}
			this.isConnected = false;
			console.log('Desconectado do RabbitMQ');
		} catch (error) {
			throw new QueueConnectionError('Erro ao desconectar do RabbitMQ', {
				originalError: error instanceof Error ? error.message : 'Unknown error',
			});
		}
	}

	async publishEvent(
		event: WebhookEvent,
		routingKey: string,
		options: MessageOptions = {},
	): Promise<void> {
		if (!this.isConnected || !this.channel) {
			throw new QueueConnectionError('RabbitMQ não está conectado', {
				routingKey,
				isConnected: this.isConnected,
				hasChannel: !!this.channel,
			});
		}

		const message = {
			...event,
			publishedAt: new Date().toISOString(),
			messageId: this.generateMessageId(),
		};

		const messageOptions = {
			persistent: true,
			contentType: 'application/json',
			timestamp: Date.now(),
			messageId: message.messageId,
			...options,
		};

		try {
			const published = this.channel.publish(
				this.config.exchangeName,
				routingKey,
				Buffer.from(JSON.stringify(message)),
				messageOptions,
			);

			if (!published) {
				throw new QueuePublishError(
					routingKey,
					new Error('Buffer cheio - falha ao publicar mensagem'),
					{
						eventname: event.eventname,
						userid: event.userid,
						messageId: message.messageId,
					},
				);
			}

			console.log(` Evento publicado: ${routingKey}`, {
				eventname: event.eventname,
				userid: event.userid,
				messageId: message.messageId,
			});
		} catch (error) {
			throw new QueuePublishError(
				routingKey,
				error instanceof Error ? error : new Error('Unknown error'),
				{
					eventname: event.eventname,
					userid: event.userid,
				},
			);
		}
	}

	async createQueue(
		queueName: string,
		routingKey: string,
		options: {
			durable?: boolean;
			exclusive?: boolean;
			autoDelete?: boolean;
			deadLetterExchange?: string;
			messageTtl?: number;
		} = {},
	): Promise<void> {
		if (!this.channel) {
			throw new QueueConnectionError('Canal RabbitMQ não está disponível', {
				queueName,
				routingKey,
			});
		}

		try {
			const queueOptions = {
				durable: true,
				exclusive: false,
				autoDelete: false,
				arguments: {
					'x-dead-letter-exchange':
						options.deadLetterExchange || `${this.config.exchangeName}.dlx`,
					...(options.messageTtl && { 'x-message-ttl': options.messageTtl }),
				},
				...options,
			};

			await this.channel.assertQueue(queueName, queueOptions);
			await this.channel.bindQueue(
				queueName,
				this.config.exchangeName,
				routingKey,
			);

			console.log(`Fila criada: ${queueName} -> ${routingKey}`);
		} catch (error) {
			throw new QueueCreationError(
				queueName,
				error instanceof Error ? error : new Error('Unknown error'),
				{ routingKey, options },
			);
		}
	}

	async consumeQueue(
		queueName: string,
		handler: (
			message: WebhookEvent & { publishedAt: string; messageId: string },
		) => Promise<void>,
		options: {
			noAck?: boolean;
			prefetch?: number;
		} = {},
	): Promise<void> {
		if (!this.channel) {
			throw new QueueConnectionError('Canal RabbitMQ não está disponível', {
				queueName,
			});
		}

		if (options.prefetch) {
			await this.channel.prefetch(options.prefetch);
		}

		await this.channel.consume(
			queueName,
			async (msg: any) => {
				if (!msg) return;

				try {
					const content = JSON.parse(msg.content.toString());
					await handler(content);

					if (!options.noAck && this.channel) {
						this.channel.ack(msg);
					}
				} catch (error) {
					console.error(
						`Erro ao processar mensagem da fila ${queueName}:`,
						error,
					);

					// Rejeita a mensagem e envia para dead letter queue
					if (!options.noAck && this.channel) {
						this.channel.nack(msg, false, false);
					}
				}
			},
			{ noAck: options.noAck || false },
		);

		console.log(`Consumindo fila: ${queueName}`);
	}

	async getQueueInfo(queueName: string): Promise<{
		messageCount: number;
		consumerCount: number;
	}> {
		if (!this.channel) {
			throw new QueueConnectionError('Canal RabbitMQ não está disponível', {
				queueName,
				operation: 'getQueueInfo',
			});
		}

		try {
			const queueInfo = await this.channel.checkQueue(queueName);
			return {
				messageCount: queueInfo.messageCount,
				consumerCount: queueInfo.consumerCount,
			};
		} catch (error) {
			throw new QueueConnectionError(
				`Erro ao obter informações da fila ${queueName}`,
				{
					queueName,
					originalError:
						error instanceof Error ? error.message : 'Unknown error',
				},
			);
		}
	}

	private handleConnectionError(error: Error): void {
		console.error('Erro de conexão RabbitMQ:', error);
		this.isConnected = false;
		this.reconnect();
	}

	private handleConnectionClose(): void {
		console.warn('️Conexão RabbitMQ fechada');
		this.isConnected = false;
		this.reconnect();
	}

	private async reconnect(): Promise<void> {
		if (this.isConnected) return;

		console.log('Tentando reconectar ao RabbitMQ...');

		const maxAttempts = this.config.retryAttempts || 3;
		for (let attempt = 1; attempt <= maxAttempts; attempt++) {
			try {
				await new Promise((resolve) =>
					setTimeout(resolve, this.config.retryDelay),
				);
				await this.connect();
				break;
			} catch (error) {
				console.error(
					`attempt de reconexão ${attempt}/${maxAttempts} falhou:`,
					error,
				);

				if (attempt === maxAttempts) {
					console.error('Falha ao reconectar após todas as attempts');
				}
			}
		}
	}

	private generateMessageId(): string {
		return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}

	get connected(): boolean {
		return this.isConnected;
	}
}

import dotenv from 'dotenv';
import {
	InvalidConfigurationError,
	MissingConfigurationError,
} from '../errors';
import type { ProcessingMode } from '../strategies/EventProcessingStrategyFactory';

dotenv.config();

export interface AppConfig {
	server: {
		port: number;
		host: string;
		rateLimit: {
			windowMs: number;
			max: number;
		};
	};
	moodle: {
		baseUrl: string;
		token: string;
	};
	rabbitmq?: {
		url: string;
		exchangeName: string;
		retryAttempts: number;
		retryDelay: number;
		enabled: boolean;
	};
	processing: {
		mode: ProcessingMode;
		enableQueue: boolean;
	};
	logging: {
		level: 'debug' | 'info' | 'warn' | 'error';
		enableAnalytics: boolean;
	};
}

export class ConfigManager {
	private static instance: ConfigManager;
	private config: AppConfig;

	private constructor() {
		this.config = this.loadConfiguration();
		this.validateConfiguration();
	}

	static getInstance(): ConfigManager {
		if (!ConfigManager.instance) {
			ConfigManager.instance = new ConfigManager();
		}
		return ConfigManager.instance;
	}

	getConfig(): AppConfig {
		return this.config;
	}

	private loadConfiguration(): AppConfig {
		const config: AppConfig = {
			server: {
				port: Number.parseInt(process.env.PORT || '3000'),
				host: process.env.HOST || '0.0.0.0',
				rateLimit: {
					windowMs: Number.parseInt(
						process.env.RATE_LIMIT_WINDOW_MS || '60000',
					),
					max: Number.parseInt(process.env.RATE_LIMIT_MAX || '100'),
				},
			},
			moodle: {
				baseUrl: process.env.MOODLE_BASE_URL || '',
				token: process.env.MOODLE_TOKEN || '',
			},
			processing: {
				mode: (process.env.PROCESSING_MODE as ProcessingMode) || 'hybrid',
				enableQueue: process.env.ENABLE_QUEUE !== 'false',
			},
			logging: {
				level:
					(process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') ||
					'info',
				enableAnalytics: process.env.ENABLE_ANALYTICS !== 'false',
			},
		};

		if (process.env.RABBITMQ_URL) {
			config.rabbitmq = {
				url: process.env.RABBITMQ_URL,
				exchangeName: process.env.RABBITMQ_EXCHANGE || 'webhook-events',
				retryAttempts: Number.parseInt(
					process.env.RABBITMQ_RETRY_ATTEMPTS || '3',
				),
				retryDelay: Number.parseInt(process.env.RABBITMQ_RETRY_DELAY || '5000'),
				enabled: process.env.RABBITMQ_ENABLED !== 'false',
			};
		}

		return config;
	}

	private validateConfiguration(): void {
		const { moodle, rabbitmq, processing } = this.config;

		if (!moodle.baseUrl || !moodle.token) {
			throw new MissingConfigurationError(['MOODLE_BASE_URL', 'MOODLE_TOKEN'], {
				component: 'ConfigManager',
				reason: 'Moodle configuration is required for webhook processing',
			});
		}

		if (processing.enableQueue && processing.mode !== 'direct') {
			if (!rabbitmq || !rabbitmq.url) {
				throw new MissingConfigurationError(['RABBITMQ_URL'], {
					component: 'ConfigManager',
					reason:
						'RabbitMQ configuration is required when queue processing is enabled',
					currentMode: processing.mode,
				});
			}
		}

		if (
			processing.mode &&
			!['direct', 'queue', 'hybrid'].includes(processing.mode)
		) {
			throw new InvalidConfigurationError(
				'PROCESSING_MODE',
				'direct | queue | hybrid',
				{
					providedValue: processing.mode,
					validValues: ['direct', 'queue', 'hybrid'],
				},
			);
		}
	}

	updateProcessingMode(mode: ProcessingMode): void {
		this.config.processing.mode = mode;
	}

	isQueueEnabled(): boolean {
		return (
			this.config.processing.enableQueue && !!this.config.rabbitmq?.enabled
		);
	}

	getRabbitMQConfig() {
		if (!this.config.rabbitmq) {
			throw new MissingConfigurationError(
				['RABBITMQ_URL', 'RABBITMQ_EXCHANGE'],
				{
					component: 'ConfigManager',
					reason: 'RabbitMQ configuration not available',
				},
			);
		}
		return this.config.rabbitmq;
	}

	getMoodleConfig() {
		return this.config.moodle;
	}

	getServerConfig() {
		return this.config.server;
	}
}

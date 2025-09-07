import dotenv from 'dotenv';
import {
	InvalidConfigurationError,
	MissingConfigurationError,
} from '../errors';
import type { ProcessingMode } from '../strategies/EventProcessingStrategyFactory';
import { EventRegistry } from './EventRegistry';

dotenv.config();

export interface AppConfig {
	server: {
		port: number;
		host: string;
		hookPath: string;
		enabledEvents: string[];
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
	service: {
		baseUrl: string;
	};
	redis: {
		url: string;
		keyPrefix: string;
		lockPrefix: string;
		defaultTtl: number;
		maxRetries: number;
	};

	circuitBreaker: {
		failureThreshold: number;
		resetTimeout: number;
		monitoringPeriod: number;
	};

	healthCheck: {
		timeout: number;
		memoryLimitMB: number;
	};

	cleanup: {
		eventTtlHours: number;
		metricsResetHours: number;
		cleanupIntervalMinutes: number;
	};

	alert: {
		url: string;
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
				hookPath: process.env.WEBHOOK_PATH || '/webhook',
				enabledEvents: EventRegistry.getInstance().getEnabledEvents(),
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
			service: {
				baseUrl: process.env.SERVICE_BASE_URL || 'http://localhost:3000',
			},
			redis: {
				url: process.env.REDIS_URL || 'redis://localhost:6379',
				keyPrefix: process.env.REDIS_KEY_PREFIX || 'webhook:events',
				lockPrefix: process.env.REDIS_LOCK_PREFIX || 'webhook:locks',
				defaultTtl: Number.parseInt(process.env.REDIS_DEFAULT_TTL || '86400'), // 24h
				maxRetries: Number.parseInt(process.env.REDIS_MAX_RETRIES || '3'),
			},

			circuitBreaker: {
				failureThreshold: Number.parseInt(
					process.env.CB_FAILURE_THRESHOLD || '5',
				),
				resetTimeout: Number.parseInt(process.env.CB_RESET_TIMEOUT || '30000'),
				monitoringPeriod: Number.parseInt(
					process.env.CB_MONITORING_PERIOD || '60000',
				),
			},

			healthCheck: {
				timeout: Number.parseInt(process.env.HEALTH_CHECK_TIMEOUT || '10000'),
				memoryLimitMB: Number.parseInt(process.env.MEMORY_LIMIT_MB || '512'),
			},

			cleanup: {
				eventTtlHours: Number.parseInt(process.env.EVENT_TTL_HOURS || '24'),
				metricsResetHours: Number.parseInt(
					process.env.METRICS_RESET_HOURS || '24',
				),
				cleanupIntervalMinutes: Number.parseInt(
					process.env.CLEANUP_INTERVAL_MINUTES || '60',
				),
			},

			alert: {
				url:
					process.env.ALERT_WEBHOOK_URL ||
					'https://hooks.slack.com/services/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',
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

	getRedisConfig() {
		return this.config.redis;
	}

	getCircuitBreakerConfig() {
		return this.config.circuitBreaker;
	}

	getHealthCheckConfig() {
		return this.config.healthCheck;
	}

	getCleanupConfig() {
		return this.config.cleanup;
	}

	getAlertConfig() {
		return this.config.alert;
	}
}

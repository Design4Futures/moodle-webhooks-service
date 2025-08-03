import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
	BaseError,
	createValidationError,
	ERROR_CODES,
	ErrorHandler,
	type ErrorHandlerConfig,
	type ErrorLogger,
	EventHandlerExecutionError,
	HTTP_STATUS_CODES,
	isOperationalError,
	MoodleAuthenticationError,
	MoodleResourceNotFoundError,
	WebhookInvalidFormatError,
} from './index';

// Mock logger para testes
const mockLogger: ErrorLogger = {
	error: jest.fn(),
	warn: jest.fn(),
	info: jest.fn(),
	debug: jest.fn(),
};

describe('Sistema de Tratamento de Erros', () => {
	describe('BaseError', () => {
		it('deve criar erro com propriedades corretas', () => {
			const error = new (class TestError extends BaseError {
				constructor() {
					super('Test message', 'TEST_ERROR', 400, true, { test: 'context' });
				}
			})();

			expect(error).toBeInstanceOf(Error);
			expect(error).toBeInstanceOf(BaseError);
			expect(error.message).toBe('Test message');
			expect(error.errorCode).toBe('TEST_ERROR');
			expect(error.statusCode).toBe(400);
			expect(error.isOperational).toBe(true);
			expect(error.context).toEqual({ test: 'context' });
			expect(error.name).toBe('TestError');
			expect(error.timestamp).toBeInstanceOf(Date);
		});

		it('deve serializar para JSON corretamente', () => {
			const error = new (class TestError extends BaseError {
				constructor() {
					super('Test message', 'TEST_ERROR', 400, true, { test: 'context' });
				}
			})();

			const json = error.toJSON();

			expect(json).toEqual(
				expect.objectContaining({
					name: 'TestError',
					message: 'Test message',
					errorCode: 'TEST_ERROR',
					statusCode: 400,
					isOperational: true,
					context: { test: 'context' },
				}),
			);
			expect(json.timestamp).toBeDefined();
			expect(json.stack).toBeDefined();
		});

		it('deve criar log format corretamente', () => {
			const error = new (class TestError extends BaseError {
				constructor() {
					super('Test message', 'TEST_ERROR', 400, true, { test: 'context' });
				}
			})();

			const logFormat = error.toLogFormat();

			expect(logFormat).toEqual(
				expect.objectContaining({
					name: 'TestError',
					message: 'Test message',
					errorCode: 'TEST_ERROR',
					context: { test: 'context' },
				}),
			);
			expect(logFormat.timestamp).toBeDefined();
		});
	});

	describe('Erros Específicos', () => {
		describe('MoodleResourceNotFoundError', () => {
			it('deve criar erro com contexto específico', () => {
				const error = new MoodleResourceNotFoundError('user', 123, {
					endpoint: 'get_user',
				});

				expect(error.errorCode).toBe('MOODLE_RESOURCE_NOT_FOUND');
				expect(error.statusCode).toBe(404);
				expect(error.message).toContain('user');
				expect(error.message).toContain('123');
				expect(error.context).toEqual(
					expect.objectContaining({
						resource: 'user',
						id: 123,
						endpoint: 'get_user',
					}),
				);
			});
		});

		describe('MoodleAuthenticationError', () => {
			it('deve criar erro de autenticação', () => {
				const error = new MoodleAuthenticationError('Token inválido', {
					userId: 123,
				});

				expect(error.errorCode).toBe('MOODLE_AUTH_ERROR');
				expect(error.statusCode).toBe(401);
				expect(error.message).toBe('Token inválido');
				expect(error.context).toEqual({ userId: 123 });
			});
		});

		describe('WebhookInvalidFormatError', () => {
			it('deve criar erro de formato de webhook', () => {
				const error = new WebhookInvalidFormatError('Campo ausente', {
					field: 'eventname',
				});

				expect(error.errorCode).toBe('WEBHOOK_INVALID_FORMAT');
				expect(error.statusCode).toBe(400);
				expect(error.context).toEqual({ field: 'eventname' });
			});
		});

		describe('EventHandlerExecutionError', () => {
			it('deve criar erro de execução de handler', () => {
				const originalError = new Error('Original error');
				const error = new EventHandlerExecutionError(
					'user_created',
					'TestHandler.handleUser',
					originalError,
					{ userId: 123 },
				);

				expect(error.errorCode).toBe('EVENT_HANDLER_EXECUTION_ERROR');
				expect(error.statusCode).toBe(500);
				expect(error.message).toContain('user_created');
				expect(error.message).toContain('TestHandler.handleUser');
				expect(error.message).toContain('Original error');
				expect(error.context).toEqual(
					expect.objectContaining({
						eventType: 'user_created',
						handlerName: 'TestHandler.handleUser',
						userId: 123,
						originalError: 'Original error',
					}),
				);
			});
		});
	});

	describe('ErrorHandler', () => {
		let errorHandler: ErrorHandler;
		let config: ErrorHandlerConfig;

		beforeEach(() => {
			jest.clearAllMocks();
			config = {
				logger: mockLogger,
				includeStackTrace: true,
				logLevel: 'error',
				enableDetailedErrors: true,
				enableErrorMetrics: true,
			};
			errorHandler = new ErrorHandler(config);
		});

		describe('handleError', () => {
			it('deve logar erro operacional corretamente', () => {
				const error = new MoodleResourceNotFoundError('user', 123);
				const context = { requestId: 'req-123' };

				errorHandler.handleError(error, context);

				expect(mockLogger.warn).toHaveBeenCalledWith(
					'Warning occurred',
					expect.objectContaining({
						name: 'MoodleResourceNotFoundError',
						message: error.message,
						isOperational: true,
						context: expect.objectContaining({
							requestId: 'req-123',
							resource: 'user',
							id: 123,
						}),
					}),
				);
			});

			it('deve logar erro crítico corretamente', () => {
				const error = new Error('Critical error');
				const context = { component: 'database' };

				errorHandler.handleError(error, context);

				expect(mockLogger.error).toHaveBeenCalledWith(
					'Error occurred',
					expect.objectContaining({
						name: 'Error',
						message: 'Critical error',
						isOperational: false,
						context,
					}),
				);
			});
		});

		describe('createErrorResponse', () => {
			it('deve criar resposta para erro tipado', () => {
				const error = new MoodleResourceNotFoundError('user', 123, {
					endpoint: 'get_user',
				});

				const response = errorHandler.createErrorResponse(error);

				expect(response).toEqual({
					statusCode: 404,
					error: 'MOODLE_RESOURCE_NOT_FOUND',
					message: error.message,
					details: expect.objectContaining({
						resource: 'user',
						id: 123,
						endpoint: 'get_user',
					}),
					timestamp: expect.any(String),
				});
			});

			it('deve criar resposta para erro genérico', () => {
				const error = new Error('Generic error');

				const response = errorHandler.createErrorResponse(error);

				expect(response).toEqual({
					statusCode: 500,
					error: 'INTERNAL_SERVER_ERROR',
					message: 'Generic error',
					timestamp: expect.any(String),
				});
			});

			it('deve omitir detalhes quando desabilitado', () => {
				const configWithoutDetails: ErrorHandlerConfig = {
					...config,
					enableDetailedErrors: false,
				};
				const handler = new ErrorHandler(configWithoutDetails);
				const error = new MoodleResourceNotFoundError('user', 123, {
					sensitive: 'data',
				});

				const response = handler.createErrorResponse(error);

				expect(response.details).toBeUndefined();
			});
		});

		describe('isRecoverableError', () => {
			it('deve identificar erros recuperáveis', () => {
				const recoverableError = new Error('ECONNREFUSED');
				const nonRecoverableError = new Error('Syntax error');

				expect(errorHandler.isRecoverableError(recoverableError)).toBe(true);
				expect(errorHandler.isRecoverableError(nonRecoverableError)).toBe(
					false,
				);
			});

			it('deve considerar erros operacionais como recuperáveis', () => {
				const operationalError = new MoodleResourceNotFoundError('user', 123);
				const nonOperationalError = new (class CriticalError extends BaseError {
					constructor() {
						super('Critical error', 'CRITICAL', 500, false);
					}
				})();

				expect(errorHandler.isRecoverableError(operationalError)).toBe(true);
				expect(errorHandler.isRecoverableError(nonOperationalError)).toBe(
					false,
				);
			});
		});

		describe('Error Metrics', () => {
			it('deve coletar métricas de erro', () => {
				const error1 = new MoodleResourceNotFoundError('user', 1);
				const error2 = new MoodleResourceNotFoundError('course', 2);
				const error3 = new WebhookInvalidFormatError('Invalid format');

				errorHandler.handleError(error1);
				errorHandler.handleError(error2);
				errorHandler.handleError(error3);

				const metrics = errorHandler.getErrorMetrics();

				expect(metrics).toEqual({
					MoodleResourceNotFoundError: 2,
					WebhookInvalidFormatError: 1,
				});
			});

			it('deve resetar métricas', () => {
				const error = new MoodleResourceNotFoundError('user', 1);
				errorHandler.handleError(error);

				expect(errorHandler.getErrorMetrics()).toEqual({
					MoodleResourceNotFoundError: 1,
				});

				errorHandler.resetErrorMetrics();

				expect(errorHandler.getErrorMetrics()).toEqual({});
			});
		});
	});

	describe('Utilitários', () => {
		describe('isOperationalError', () => {
			it('deve identificar erro operacional', () => {
				const operationalError = new MoodleResourceNotFoundError('user', 123);
				const nonOperationalError = new Error('Generic error');

				expect(isOperationalError(operationalError)).toBe(true);
				expect(isOperationalError(nonOperationalError)).toBe(false);
			});
		});

		describe('createValidationError', () => {
			it('deve criar erro de validação', () => {
				const error = createValidationError('email', 'Invalid format', {
					value: 'invalid',
				});

				expect(error.errorCode).toBe('VALIDATION_ERROR');
				expect(error.message).toContain('email');
				expect(error.message).toContain('Invalid format');
				expect(error.context).toEqual({ field: 'email', value: 'invalid' });
			});
		});
	});

	describe('Constantes', () => {
		it('deve exportar códigos de erro', () => {
			expect(ERROR_CODES.MOODLE_RESOURCE_NOT_FOUND).toBe(
				'MOODLE_RESOURCE_NOT_FOUND',
			);
			expect(ERROR_CODES.WEBHOOK_INVALID_FORMAT).toBe('WEBHOOK_INVALID_FORMAT');
			expect(ERROR_CODES.EVENT_HANDLER_EXECUTION_ERROR).toBe(
				'EVENT_HANDLER_EXECUTION_ERROR',
			);
		});

		it('deve exportar status HTTP', () => {
			expect(HTTP_STATUS_CODES.NOT_FOUND).toBe(404);
			expect(HTTP_STATUS_CODES.BAD_REQUEST).toBe(400);
			expect(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).toBe(500);
		});
	});

	describe('Integração com Fastify', () => {
		it('deve criar resposta HTTP correta para erro tipado', async () => {
			const errorHandler = new ErrorHandler({
				logger: mockLogger,
				includeStackTrace: true,
				logLevel: 'error',
				enableDetailedErrors: true,
				enableErrorMetrics: true,
			});

			const mockRequest = {
				id: 'req-123',
				method: 'POST',
				url: '/webhook',
				ip: '127.0.0.1',
				headers: { 'user-agent': 'test-agent' },
			};

			const mockReply = {
				status: jest.fn().mockReturnThis(),
				send: jest.fn().mockReturnThis(),
			};

			const error = new WebhookInvalidFormatError('Invalid payload');

			await errorHandler.handleFastifyError(
				error,
				mockRequest as any,
				mockReply as any,
			);

			expect(mockReply.status).toHaveBeenCalledWith(400);
			expect(mockReply.send).toHaveBeenCalledWith(
				expect.objectContaining({
					statusCode: 400,
					error: 'WEBHOOK_INVALID_FORMAT',
					message: 'Invalid payload',
				}),
			);
		});
	});
});

describe('Casos de Uso Reais', () => {
	let errorHandler: ErrorHandler;

	beforeEach(() => {
		errorHandler = new ErrorHandler({
			logger: mockLogger,
			includeStackTrace: false,
			logLevel: 'error',
			enableDetailedErrors: true,
			enableErrorMetrics: true,
		});
	});

	it('deve tratar erro de conexão com Moodle', () => {
		const error = new MoodleAuthenticationError('Token expired', {
			userId: 123,
			endpoint: 'get_user',
			lastValidToken: '2023-01-01',
		});

		const response = errorHandler.createErrorResponse(error);

		expect(response.statusCode).toBe(401);
		expect(response.error).toBe('MOODLE_AUTH_ERROR');
		expect(response.details).toEqual(
			expect.objectContaining({
				userId: 123,
				endpoint: 'get_user',
			}),
		);
	});

	it('deve tratar erro de processamento de webhook', () => {
		const originalError = new Error('Database connection failed');
		const error = new EventHandlerExecutionError(
			'user_created',
			'UserService.createUser',
			originalError,
			{
				userId: 123,
				retryCount: 2,
				webhookId: 'wh-456',
			},
		);

		errorHandler.handleError(error, { requestId: 'req-789' });

		expect(mockLogger.error).toHaveBeenCalledWith(
			'Error occurred',
			expect.objectContaining({
				name: 'EventHandlerExecutionError',
				isOperational: true,
				context: expect.objectContaining({
					requestId: 'req-789',
					eventType: 'user_created',
					handlerName: 'UserService.createUser',
					originalError: 'Database connection failed',
					userId: 123,
					retryCount: 2,
					webhookId: 'wh-456',
				}),
			}),
		);
	});

	it('deve tratar múltiplos erros e coletar métricas', () => {
		const errors = [
			new MoodleResourceNotFoundError('user', 1),
			new MoodleResourceNotFoundError('course', 2),
			new WebhookInvalidFormatError('Missing eventname'),
			new WebhookInvalidFormatError('Missing userid'),
			new EventHandlerExecutionError(
				'user_created',
				'Handler',
				new Error('Test'),
			),
		];

		errors.forEach((error) => errorHandler.handleError(error));

		const metrics = errorHandler.getErrorMetrics();

		expect(metrics).toEqual({
			MoodleResourceNotFoundError: 2,
			WebhookInvalidFormatError: 2,
			EventHandlerExecutionError: 1,
		});
	});
});

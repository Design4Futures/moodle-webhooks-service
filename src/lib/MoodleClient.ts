import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import {
	MoodleAuthenticationError,
	MoodleConnectionError,
	MoodleInvalidParametersError,
	MoodleInvalidResponseError,
	MoodleResourceNotFoundError,
	MoodleTimeoutError,
} from '../errors';
import type {
	MoodleConfig,
	MoodleCourse,
	MoodleResponse,
	MoodleUser,
} from '../types/moodle';

export class MoodleClient {
	private client: AxiosInstance;
	private config: MoodleConfig;

	constructor(config: MoodleConfig) {
		this.config = {
			service: 'microcredenciais',
			...config,
		};

		this.client = axios.create({
			baseURL: `${this.config.baseUrl}/webservice/rest/server.php`,
			timeout: 30000,
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
		});
	}

	private async makeRequest<T>(
		wsfunction: string,
		// biome-ignore lint/suspicious/noExplicitAny: <any>
		params: Record<string, any> = {},
	): Promise<T> {
		try {
			const data = new URLSearchParams({
				wstoken: this.config.token,
				wsfunction,
				moodlewsrestformat: 'json',
				...this.flattenParams(params),
			});

			const response: AxiosResponse<T> = await this.client.post('', data);

			if (this.isErrorResponse(response.data)) {
				// Tratar diferentes tipos de erro do Moodle
				const errorData = response.data as MoodleResponse;

				if (
					errorData.errorcode === 'invalidtoken' ||
					errorData.errorcode === 'accessdenied'
				) {
					throw new MoodleAuthenticationError(
						errorData.message || 'Token de autenticação inválido',
						{ wsfunction, errorCode: errorData.errorcode },
					);
				}

				if (errorData.errorcode === 'invalidparameter') {
					throw new MoodleInvalidParametersError(Object.keys(params), {
						wsfunction,
						message: errorData.message,
					});
				}

				throw new MoodleInvalidResponseError(
					errorData.message ||
						errorData.exception ||
						'Resposta inválida da API do Moodle',
					{
						wsfunction,
						errorCode: errorData.errorcode,
						debugInfo: errorData.debuginfo,
					},
				);
			}

			return response.data;
		} catch (error) {
			if (axios.isAxiosError(error)) {
				// Tratar diferentes tipos de erro HTTP
				if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
					throw new MoodleConnectionError(
						'Não foi possível conectar ao servidor Moodle',
						{
							wsfunction,
							baseUrl: this.config.baseUrl,
							errorCode: error.code,
						},
					);
				}

				if (
					error.code === 'ECONNABORTED' ||
					error.message.includes('timeout')
				) {
					throw new MoodleTimeoutError(
						30000, // timeout padrão
						{ wsfunction, baseUrl: this.config.baseUrl },
					);
				}

				if (error.response?.status === 401) {
					throw new MoodleAuthenticationError('Credenciais inválidas', {
						wsfunction,
						status: error.response.status,
					});
				}

				if (error.response?.status === 404) {
					throw new MoodleResourceNotFoundError('endpoint', wsfunction, {
						baseUrl: this.config.baseUrl,
					});
				}

				throw new MoodleConnectionError(`Erro HTTP: ${error.message}`, {
					wsfunction,
					status: error.response?.status,
					statusText: error.response?.statusText,
				});
			}

			// Re-throw erros já tipados
			if (
				error instanceof MoodleAuthenticationError ||
				error instanceof MoodleConnectionError ||
				error instanceof MoodleInvalidResponseError ||
				error instanceof MoodleResourceNotFoundError ||
				error instanceof MoodleTimeoutError ||
				error instanceof MoodleInvalidParametersError
			) {
				throw error;
			}

			// Erro desconhecido
			throw new MoodleInvalidResponseError(
				`Erro desconhecido: ${error instanceof Error ? error.message : 'Unknown error'}`,
				{ wsfunction, originalError: error },
			);
		}
	}

	private flattenParams(
		// biome-ignore lint/suspicious/noExplicitAny: <any>
		obj: Record<string, any>,
		prefix = '',
	): Record<string, string> {
		const flattened: Record<string, string> = {};

		Object.keys(obj).forEach((key) => {
			const value = obj[key];
			const newKey = prefix ? `${prefix}[${key}]` : key;

			if (value && typeof value === 'object' && !Array.isArray(value)) {
				Object.assign(flattened, this.flattenParams(value, newKey));
			} else if (Array.isArray(value)) {
				value.forEach((item, index) => {
					if (typeof item === 'object') {
						Object.assign(
							flattened,
							this.flattenParams(item, `${newKey}[${index}]`),
						);
					} else {
						flattened[`${newKey}[${index}]`] = String(item);
					}
				});
			} else {
				flattened[newKey] = String(value);
			}
		});

		return flattened;
	}

	// biome-ignore lint/suspicious/noExplicitAny: <any>
	private isErrorResponse(data: any): data is MoodleResponse {
		return data && (data.exception || data.errorcode || data.message);
	}

	async getUserById(id: number | string): Promise<MoodleUser> {
		try {
			const response = await this.makeRequest<MoodleUser[]>(
				'core_user_get_users_by_field',
				{
					field: 'id',
					values: [id],
				},
			);

			if (!response || response.length === 0 || !response[0]) {
				throw new MoodleResourceNotFoundError('user', id);
			}

			return response[0];
		} catch (error) {
			if (error instanceof MoodleResourceNotFoundError) {
				throw error;
			}
			throw new MoodleResourceNotFoundError('user', id, {
				originalError: error,
			});
		}
	}

	async getCourseById(id: number): Promise<MoodleCourse> {
		try {
			const response = await this.makeRequest<{ courses: MoodleCourse[] }>(
				'core_course_get_courses_by_field',
				{
					field: 'id',
					value: id,
				},
			);

			if (
				!response?.courses ||
				response.courses.length === 0 ||
				!response.courses[0]
			) {
				throw new MoodleResourceNotFoundError('course', id);
			}

			return response.courses[0];
		} catch (error) {
			if (error instanceof MoodleResourceNotFoundError) {
				throw error;
			}
			throw new MoodleResourceNotFoundError('course', id, {
				originalError: error,
			});
		}
	}

	// biome-ignore lint/suspicious/noExplicitAny: <any>
	async getGrades(courseId: number, userId?: number): Promise<any> {
		// biome-ignore lint/suspicious/noExplicitAny: <any>
		const params: any = { courseid: courseId };
		if (userId) params.userid = userId;

		return this.makeRequest('gradereport_user_get_grades_table', params);
	}

	async testConnection(): Promise<{
		sitename: string;
		username: string;
		release: string;
	}> {
		return this.makeRequest('core_webservice_get_site_info');
	}
}

import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import type { AppConfig } from '../config/ConfigManager';
import { CircuitBreaker } from '../services/CircuitBreaker';
import type { MoodleCourse, MoodleUser } from '../types/moodle';

export class ServiceClient {
	private client: AxiosInstance;
	private config: AppConfig;
	private circuitBreaker: CircuitBreaker;

	constructor(config: AppConfig) {
		this.config = {
			...config,
		};

		this.client = axios.create({
			baseURL: `${this.config.service.baseUrl}`,
			timeout: 30000,
			headers: {
				'Content-Type': 'application/json',
			},
		});

		this.circuitBreaker = new CircuitBreaker({
			failureThreshold: 5,
			resetTimeout: 30000,
			monitoringPeriod: 60000,
		});
	}

	/**
	 * Método genérico para requisições HTTP ao microserviço
	 * @param method - Método HTTP (get, post, put, delete, etc)
	 * @param url - Caminho relativo à baseURL configurada
	 * @param data - Payload da requisição (opcional)
	 * @param headers - Headers adicionais (opcional)
	 */

	private async makeRequest<T>(
		method: 'get' | 'post' | 'put' | 'delete' | 'patch',
		url: string,
		// biome-ignore lint/suspicious/noExplicitAny: any data
		data?: any,
		headers?: Record<string, string>,
	): Promise<AxiosResponse<T>> {
		return this.circuitBreaker.execute(async () => {
			const requestConfig = {
				method,
				url,
				data,
				...(headers ? { headers } : {}),
			};

			return this.client.request<T>(requestConfig);
		});
	}

	getCircuitBreakerStats() {
		return this.circuitBreaker.getStats();
	}

	public async createUserProfile(user: MoodleUser): Promise<void> {
		const data = {
			email: user.email,
			externalUserId: user.id,
			name: user.fullname,
			image: user.profileimageurl,
		};
		await this.makeRequest('post', '/api/v1/users', data);
	}

	public async createCourseProfile(course: MoodleCourse): Promise<void> {
		const data = {
			externalCourseId: course.id,
			title: course.shortname,
			description: course.fullname,
		};
		await this.makeRequest('post', '/api/v1/courses', data);
	}

	public async courseCompleted(
		user: MoodleUser,
		course: MoodleCourse,
	): Promise<void> {
		const data = {
			externalCourseId: course.id,
			externalUserId: user.id,
			completionDate: new Date().toISOString(),
		};
		await this.makeRequest(
			'post',
			'/api/v1/microcredentials/course/assign',
			data,
		);
	}

	async testConnection(): Promise<{
		service: string;
		db: string;
	}> {
		const response = await this.makeRequest<{ service: string; db: string }>(
			'get',
			'/api/v1/health',
		);
		return response.data;
	}
}

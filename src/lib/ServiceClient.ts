import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import type { AppConfig } from '../config/ConfigManager';
import type { MoodleUser } from '../types/moodle';

export class ServiceClient {
	private client: AxiosInstance;
	private config: AppConfig;

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
	}

	/**
	 * Método genérico para requisições HTTP ao microserviço
	 * @param method - Método HTTP (get, post, put, delete, etc)
	 * @param url - Caminho relativo à baseURL configurada
	 * @param data - Payload da requisição (opcional)
	 * @param headers - Headers adicionais (opcional)
	 */
	private async makeRequest<T = any>(
		method: 'get' | 'post' | 'put' | 'delete' | 'patch',
		url: string,
		data?: any,
		headers?: Record<string, string>,
	): Promise<AxiosResponse<T>> {
		const requestConfig = {
			method,
			url,
			data,
			...(headers ? { headers } : {}),
		};

		return this.client.request<T>(requestConfig);
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
}

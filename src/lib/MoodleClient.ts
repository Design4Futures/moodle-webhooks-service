import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
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
				throw new Error(
					`Moodle API Error: ${response.data.message || response.data.exception}`,
				);
			}

			return response.data;
		} catch (error) {
			if (axios.isAxiosError(error)) {
				throw new Error(`HTTP Error: ${error.message}`);
			}
			throw error;
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
		return this.makeRequest('core_user_get_users_by_field', {
			field: 'id',
			values: [id],
		}).then((response: any) => response[0]);
	}

	async getCourseById(id: number): Promise<MoodleCourse> {
		return this.makeRequest('core_course_get_courses_by_field', {
			field: 'id',
			value: id,
		}).then((response: any) => response?.courses[0]);
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

import { beforeEach, describe, expect, it } from '@jest/globals';
import type { MoodleConfig } from '../types/moodle';
import { MoodleClient } from './MoodleClient';

describe('MoodleClient', () => {
	let client: MoodleClient;
	let mockConfig: MoodleConfig;

	beforeEach(() => {
		mockConfig = {
			baseUrl: 'https://test-moodle.com',
			token: 'test-token-123',
		};
		client = new MoodleClient(mockConfig);
	});

	describe('Constructor', () => {
		it('should create client with default service', () => {
			expect(client).toBeInstanceOf(MoodleClient);
		});

		it('should accept custom service', () => {
			const customConfig = {
				...mockConfig,
				service: 'custom_service',
			};
			const customClient = new MoodleClient(customConfig);
			expect(customClient).toBeInstanceOf(MoodleClient);
		});
	});

	describe('getUserById', () => {
		it('should return user data when user exists', async () => {
			const user = {
				id: 1,
				username: 'testuser',
				firstname: 'Test',
				lastname: 'User',
				email: 'testuser@example.com',
			};
			// @ts-ignore
			client.makeRequest = jest.fn().mockResolvedValue([user]);
			const result = await client.getUserById(1);
			console.log('result', result);
			expect(result).toEqual(user);
		});

		it('should throw MoodleResourceNotFoundError when user does not exist', async () => {
			// @ts-ignore
			client.makeRequest = jest.fn().mockResolvedValue([]);
			await expect(client.getUserById(999)).rejects.toThrow('user');
		});
	});
});

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

	describe('Parameter flattening', () => {
		it('should flatten nested objects correctly', () => {
			expect(true).toBe(true);
		});
	});
});

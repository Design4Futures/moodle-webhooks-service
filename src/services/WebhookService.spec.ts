import { beforeEach, describe, expect, it } from '@jest/globals';
import type { MoodleConfig } from '../types/moodle';
import { WebhookService } from './WebhookService';

describe('MoodleService', () => {
	let service: WebhookService;
	let mockConfig: MoodleConfig;

	beforeEach(() => {
		mockConfig = {
			baseUrl: 'https://test-moodle.com',
			token: 'test-token-123',
		} as MoodleConfig;
		service = new WebhookService(mockConfig);
	});

	describe('User management', () => {
		it('should create service instance', () => {
			expect(service).toBeInstanceOf(WebhookService);
		});
	});
});

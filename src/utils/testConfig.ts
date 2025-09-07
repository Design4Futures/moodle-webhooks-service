import { ConfigManager } from '../config/ConfigManager';
import { EventRegistry } from '../config/EventRegistry';
import { type ErrorHandler, initializeErrorHandling } from '../errors';

async function testModernWebhookManager() {
	console.log('Testing Modern WebhookManager Configuration...\n');

	const errorHandler: ErrorHandler = initializeErrorHandling();

	try {
		//* Testar ConfigManager
		const configManager = ConfigManager.getInstance();
		const config = configManager.getConfig();

		console.log('ConfigManager initialized successfully');
		console.log(`   - Processing Mode: ${config.processing.mode}`);
		console.log(`   - Queue Enabled: ${configManager.isQueueEnabled()}`);
		console.log(`   - Server: ${config.server.host}:${config.server.port}`);

		//* Testar EventRegistry
		const eventRegistry = EventRegistry.getInstance();
		const enabledEvents = eventRegistry.getEnabledEvents();

		console.log('\nEventRegistry initialized successfully');
		console.log(`   - Enabled Events: ${enabledEvents.length}`);
		console.log(`   - Events: ${enabledEvents.join(', ')}`);

		console.log('\nAll systems ready! WebhookManager can be started safely.');
		return true;
	} catch (error) {
		errorHandler.handleError(
			error instanceof Error ? error : new Error('Configuration test failed'),
			{ component: 'testConfig', operation: 'testModernWebhookManager' },
		);
		return false;
	}
}

if (require.main === module) {
	testModernWebhookManager();
}

export { testModernWebhookManager };

import type { FastifyInstance } from 'fastify';

export function setupGracefulShutdown(
	fastifyInstance?: FastifyInstance,
	cleanupFunctions: Array<() => Promise<void>> = [],
): void {
	const gracefulShutdown = async (signal: string) => {
		console.log(`Received ${signal}, starting graceful shutdown...`);

		try {
			if (fastifyInstance) {
				await fastifyInstance.close();
			}

			await Promise.all(cleanupFunctions.map((fn) => fn()));

			console.log('Graceful shutdown completed');
			process.exit(0);
		} catch (error) {
			console.error('Error during graceful shutdown:', error);
			process.exit(1);
		}
	};

	process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
	process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

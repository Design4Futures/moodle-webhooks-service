export function createErrorWrapper(baseContext: Record<string, unknown>) {
	return function wrapError<T extends Error>(
		error: T,
		additionalContext?: Record<string, unknown>,
	): T {
		if (error instanceof Error && 'context' in error) {
			// biome-ignore lint/suspicious/noExplicitAny: Error context manipulation
			(error as any).context = {
				...baseContext,
				// biome-ignore lint/suspicious/noExplicitAny: Error context manipulation
				...(error as any).context,
				...additionalContext,
			};
		}
		return error;
	};
}

import { MoodleResourceNotFoundError } from '../moodle/MoodleResourceNotFoundError';

/**
 * Função utilitária para criar erro de recurso não encontrado
 */
export function createNotFoundError(
	resource: string,
	id: string | number,
	context?: Record<string, unknown>,
): MoodleResourceNotFoundError {
	return new MoodleResourceNotFoundError(resource, id, context);
}

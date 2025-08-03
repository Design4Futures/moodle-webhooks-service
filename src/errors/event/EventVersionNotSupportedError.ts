import { BaseError } from '../base/BaseError';

/**
 * Erro para evento com versão não suportada
 */
export class EventVersionNotSupportedError extends BaseError {
	constructor(
		eventType: string,
		version: string,
		supportedVersions: string[],
		context?: Record<string, unknown>,
	) {
		super(
			`Versão ${version} do evento ${eventType} não suportada. Versões suportadas: ${supportedVersions.join(', ')}`,
			'EVENT_VERSION_NOT_SUPPORTED',
			400,
			true,
			{ ...context, eventType, version, supportedVersions },
		);
	}
}

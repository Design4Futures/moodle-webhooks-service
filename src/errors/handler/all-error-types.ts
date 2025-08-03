import type {
	EventError,
	EventHandlerExecutionError,
	EventHandlerNotFoundError,
	EventHandlerTimeoutError,
	EventInvalidFormatError,
	EventRejectedError,
	EventSerializationError,
	EventVersionNotSupportedError,
} from '../event';
import type {
	MoodleAuthenticationError,
	MoodleConnectionError,
	MoodleError,
	MoodleInvalidParametersError,
	MoodleInvalidResponseError,
	MoodleRateLimitError,
	MoodleResourceNotFoundError,
	MoodleTimeoutError,
} from '../moodle';
import type {
	QueueCapacityExceededError,
	QueueConnectionError,
	QueueConsumeError,
	QueueCreationError,
	QueueError,
	QueueInvalidMessageError,
	QueueNotFoundError,
	QueuePublishError,
	QueueTimeoutError,
} from '../queue';
import type {
	ConfigurationError,
	DNSError,
	InvalidConfigurationError,
	InvalidDataFormatError,
	MissingConfigurationError,
	MissingDataError,
	NetworkError,
	NetworkTimeoutError,
	ValidationError,
} from '../system';
import type {
	WebhookDuplicateError,
	WebhookError,
	WebhookEventProcessingError,
	WebhookInvalidFormatError,
	WebhookInvalidTokenError,
	WebhookPayloadTooLargeError,
	WebhookRateLimitError,
	WebhookTimeoutError,
	WebhookUnsupportedEventError,
} from '../webhook';

// Types para facilitar o uso
export type AllErrorTypes =
	| MoodleError
	| MoodleAuthenticationError
	| MoodleConnectionError
	| MoodleInvalidParametersError
	| MoodleInvalidResponseError
	| MoodleRateLimitError
	| MoodleResourceNotFoundError
	| MoodleTimeoutError
	| WebhookError
	| WebhookDuplicateError
	| WebhookEventProcessingError
	| WebhookInvalidFormatError
	| WebhookInvalidTokenError
	| WebhookPayloadTooLargeError
	| WebhookRateLimitError
	| WebhookTimeoutError
	| WebhookUnsupportedEventError
	| QueueError
	| QueueCapacityExceededError
	| QueueConnectionError
	| QueueConsumeError
	| QueueCreationError
	| QueueInvalidMessageError
	| QueueNotFoundError
	| QueuePublishError
	| QueueTimeoutError
	| ConfigurationError
	| DNSError
	| InvalidConfigurationError
	| InvalidDataFormatError
	| MissingConfigurationError
	| MissingDataError
	| NetworkError
	| NetworkTimeoutError
	| ValidationError
	| EventError
	| EventHandlerExecutionError
	| EventHandlerNotFoundError
	| EventHandlerTimeoutError
	| EventInvalidFormatError
	| EventRejectedError
	| EventSerializationError
	| EventVersionNotSupportedError;

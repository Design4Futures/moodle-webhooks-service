export interface WebhookMetrics {
	eventsReceived: Map<string, number>;
	eventsProcessed: Map<string, number>;
	eventsFailed: Map<string, number>;
	processingDurations: Map<string, number[]>;
	circuitBreakerStates: Map<string, string>;
	lastReset: Date;
}

export class MetricsCollector {
	private metrics: WebhookMetrics = {
		eventsReceived: new Map(),
		eventsProcessed: new Map(),
		eventsFailed: new Map(),
		processingDurations: new Map(),
		circuitBreakerStates: new Map(),
		lastReset: new Date(),
	};

	recordEventReceived(eventType: string): void {
		const current = this.metrics.eventsReceived.get(eventType) || 0;
		this.metrics.eventsReceived.set(eventType, current + 1);
	}

	recordEventProcessed(eventType: string, durationMs: number): void {
		// Count
		const current = this.metrics.eventsProcessed.get(eventType) || 0;
		this.metrics.eventsProcessed.set(eventType, current + 1);

		// Duration
		const durations = this.metrics.processingDurations.get(eventType) || [];
		durations.push(durationMs);

		// Keep only last 100 measurements to avoid memory leaks
		if (durations.length > 100) {
			durations.shift();
		}

		this.metrics.processingDurations.set(eventType, durations);
	}

	recordEventFailed(eventType: string, error: Error): void {
		const current = this.metrics.eventsFailed.get(eventType) || 0;
		this.metrics.eventsFailed.set(eventType, current + 1);

		console.error(`Event processing failed for ${eventType}:`, {
			error: error.message,
			stack: error.stack,
			timestamp: new Date().toISOString(),
		});
	}

	recordCircuitBreakerState(service: string, state: string): void {
		this.metrics.circuitBreakerStates.set(service, state);
	}

	getMetricsSummary(): {
		totalEvents: number;
		successRate: number;
		averageProcessingTime: Record<string, number>;
		eventTypeBreakdown: Record<
			string,
			{
				received: number;
				processed: number;
				failed: number;
				successRate: number;
			}
		>;
		circuitBreakers: Record<string, string>;
	} {
		const eventTypes = new Set([
			...this.metrics.eventsReceived.keys(),
			...this.metrics.eventsProcessed.keys(),
			...this.metrics.eventsFailed.keys(),
		]);

		const eventTypeBreakdown: Record<string, any> = {};
		let totalReceived = 0;
		let totalProcessed = 0;

		for (const eventType of eventTypes) {
			const received = this.metrics.eventsReceived.get(eventType) || 0;
			const processed = this.metrics.eventsProcessed.get(eventType) || 0;
			const failed = this.metrics.eventsFailed.get(eventType) || 0;

			totalReceived += received;
			totalProcessed += processed;

			eventTypeBreakdown[eventType] = {
				received,
				processed,
				failed,
				successRate: received > 0 ? (processed / received) * 100 : 0,
			};
		}

		const averageProcessingTime: Record<string, number> = {};
		for (const [
			eventType,
			durations,
		] of this.metrics.processingDurations.entries()) {
			if (durations.length > 0) {
				averageProcessingTime[eventType] =
					durations.reduce((sum, dur) => sum + dur, 0) / durations.length;
			}
		}

		return {
			totalEvents: totalReceived,
			successRate:
				totalReceived > 0 ? (totalProcessed / totalReceived) * 100 : 0,
			averageProcessingTime,
			eventTypeBreakdown,
			circuitBreakers: Object.fromEntries(this.metrics.circuitBreakerStates),
		};
	}

	reset(): void {
		this.metrics = {
			eventsReceived: new Map(),
			eventsProcessed: new Map(),
			eventsFailed: new Map(),
			processingDurations: new Map(),
			circuitBreakerStates: new Map(),
			lastReset: new Date(),
		};
	}

	exportPrometheusMetrics(): string {
		const lines: string[] = [];

		// Events received
		lines.push(
			'# HELP webhook_events_received_total Total number of webhook events received',
		);
		lines.push('# TYPE webhook_events_received_total counter');
		for (const [eventType, count] of this.metrics.eventsReceived.entries()) {
			lines.push(
				`webhook_events_received_total{event_type="${eventType}"} ${count}`,
			);
		}

		// Events processed
		lines.push(
			'# HELP webhook_events_processed_total Total number of webhook events processed successfully',
		);
		lines.push('# TYPE webhook_events_processed_total counter');
		for (const [eventType, count] of this.metrics.eventsProcessed.entries()) {
			lines.push(
				`webhook_events_processed_total{event_type="${eventType}"} ${count}`,
			);
		}

		// Events failed
		lines.push(
			'# HELP webhook_events_failed_total Total number of webhook events that failed processing',
		);
		lines.push('# TYPE webhook_events_failed_total counter');
		for (const [eventType, count] of this.metrics.eventsFailed.entries()) {
			lines.push(
				`webhook_events_failed_total{event_type="${eventType}"} ${count}`,
			);
		}

		return lines.join('\n');
	}
}

import { ConfigManager } from '../config/ConfigManager';

export interface Alert {
	id: string;
	level: 'info' | 'warning' | 'error' | 'critical';
	title: string;
	message: string;
	component: string;
	timestamp: Date;
	metadata?: Record<string, any>;
}

export interface AlertRule {
	name: string;
	condition: (metrics: any, health: any) => boolean;
	severity: 'info' | 'warning' | 'error' | 'critical';
	message: string;
	cooldown: number; // ms
}

export class AlertService {
	private config = ConfigManager.getInstance().getAlertConfig();
	private alerts: Alert[] = [];
	private alertHistory: Alert[] = [];
	private lastAlertTime: Map<string, number> = new Map();

	private rules: AlertRule[] = [
		{
			name: 'high_error_rate',
			condition: (metrics) => metrics.successRate < 95,
			severity: 'error',
			message: 'Success rate below 95%',
			cooldown: 5 * 60 * 1000, // 5 minutes
		},
		{
			name: 'system_down',
			condition: (_, health) => health.status === 'DOWN',
			severity: 'critical',
			message: 'System health is DOWN',
			cooldown: 1 * 60 * 1000, // 1 minute
		},
		{
			name: 'high_memory_usage',
			condition: (_, health) => {
				const memoryComponent = health.components['memory-usage'];
				return memoryComponent?.details?.usagePercentage > 90;
			},
			severity: 'warning',
			message: 'Memory usage above 90%',
			cooldown: 10 * 60 * 1000, // 10 minutes
		},
		{
			name: 'circuit_breaker_open',
			condition: (_, health) => {
				const moodleComponent = health.components['moodle-api'];
				return moodleComponent?.details?.circuitBreaker?.state === 'OPEN';
			},
			severity: 'error',
			message: 'Moodle API circuit breaker is OPEN',
			cooldown: 5 * 60 * 1000,
		},
	];

	checkAlerts(metrics: any, health: any): Alert[] {
		const newAlerts: Alert[] = [];

		for (const rule of this.rules) {
			if (rule.condition(metrics, health)) {
				const lastAlert = this.lastAlertTime.get(rule.name);
				const now = Date.now();

				//! Verificar cooldown
				if (!lastAlert || now - lastAlert > rule.cooldown) {
					const alert: Alert = {
						id: `${rule.name}_${now}`,
						level: rule.severity,
						title: rule.name.replace(/_/g, ' ').toUpperCase(),
						message: rule.message,
						component: 'webhook-system',
						timestamp: new Date(),
						metadata: { metrics, health: health.status },
					};

					newAlerts.push(alert);
					this.alerts.push(alert);
					this.alertHistory.push(alert);
					this.lastAlertTime.set(rule.name, now);

					// Enviar notificação
					this.sendNotification(alert).catch(console.error);
				}
			}
		}

		return newAlerts;
	}

	private async sendNotification(alert: Alert): Promise<void> {
		console.log(`🚨 ALERT: ${alert.level.toUpperCase()} - ${alert.title}`);
		console.log(`   Message: ${alert.message}`);
		console.log(`   Component: ${alert.component}`);
		console.log(`   Time: ${alert.timestamp.toISOString()}`);

		//TODO: Implementar integração com Slack, Discord, email, etc.
		if (this.config.url && alert.level === 'critical') {
			try {
				await this.sendSlackNotification(alert);
			} catch (error) {
				console.error('Failed to send Slack notification:', error);
			}
		}
	}

	private async sendSlackNotification(alert: Alert): Promise<void> {
		const webhookUrl = this.config.url;
		if (!webhookUrl) return;

		const color = {
			info: '#36a64f',
			warning: '#ff9500',
			error: '#ff0000',
			critical: '#8b0000',
		}[alert.level];

		const payload = {
			attachments: [
				{
					color,
					title: `🚨 ${alert.title}`,
					text: alert.message,
					fields: [
						{
							title: 'Component',
							value: alert.component,
							short: true,
						},
						{
							title: 'Severity',
							value: alert.level.toUpperCase(),
							short: true,
						},
						{
							title: 'Time',
							value: alert.timestamp.toISOString(),
							short: false,
						},
					],
				},
			],
		};

		const response = await fetch(webhookUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			throw new Error(`Slack API error: ${response.status}`);
		}
	}

	getActiveAlerts(): Alert[] {
		//! Retornar alertas das últimas 24 horas
		const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
		return this.alerts.filter((alert) => alert.timestamp.getTime() > oneDayAgo);
	}

	getAlertHistory(limit: number = 100): Alert[] {
		return this.alertHistory.slice(-limit);
	}

	clearAlert(alertId: string): boolean {
		const index = this.alerts.findIndex((alert) => alert.id === alertId);
		if (index > -1) {
			this.alerts.splice(index, 1);
			return true;
		}
		return false;
	}
}

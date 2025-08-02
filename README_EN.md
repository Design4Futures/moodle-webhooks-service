# Moodle Webhooks Service

A scalable Node.js/TypeScript service for processing webhook events from Moodle Learning Management System instances with support for multiple processing strategies and RabbitMQ message queuing. [1](#0-0)

## Features

- **Multiple Processing Modes**: Direct, Queue, and Hybrid processing strategies for different deployment scenarios
- **RabbitMQ Integration**: Asynchronous message processing with retry logic and dead letter queues
- **Event Handling**: Comprehensive handlers for Moodle events like user creation, course completion, and enrollments
- **Docker Support**: Complete containerized deployment with Docker Compose
- **Security**: Rate limiting, CORS, and webhook secret validation

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- RabbitMQ (optional, for queue processing)
- Moodle instance with webhook capability

### Installation

```bash
# Clone the repository
git clone https://github.com/Design4Futures/moodle-webhooks-service.git
cd moodle-webhooks-service

# Install dependencies
pnpm install
```

### Configuration

1. Copy the environment template:

```bash
cp .env.example .env
```

2. Configure your environment variables:

```env
MOODLE_BASE_URL=https://your-moodle-site.com
MOODLE_TOKEN=your-moodle-webservice-token
WEBHOOK_SECRET=your-webhook-secret-key
PROCESSING_MODE=hybrid
```

### Running the Service

**Development mode:**

```bash
pnpm dev
```

**Production mode:**

```bash
pnpm build
pnpm start
```

**With Docker:**

```bash
docker-compose up -d
```

## Processing Modes

The service supports three processing strategies:

- **Direct** (`PROCESSING_MODE=direct`): Synchronous event processing
- **Queue** (`PROCESSING_MODE=queue`): Asynchronous processing via RabbitMQ
- **Hybrid** (`PROCESSING_MODE=hybrid`): Queue-first with direct fallback (recommended)

## Event Handlers

The system includes handlers for common Moodle events:

- User creation
- Course enrollment and completion
- Assignment submissions

## Docker Deployment

The project includes a complete Docker setup with RabbitMQ:

```bash
# Start all services
docker-compose up -d

# Access RabbitMQ Management UI
open http://localhost:15672
# Username: admin, Password: admin123
```

## Configuration

Key configuration options via environment variables:

| Variable            | Description                | Default                   |
| ------------------- | -------------------------- | ------------------------- |
| `MOODLE_BASE_URL` | Moodle instance URL        | Required                  |
| `MOODLE_TOKEN`    | Web service token          | Required                  |
| `PROCESSING_MODE` | Processing strategy        | `hybrid`                |
| `RABBITMQ_URL`    | RabbitMQ connection string | `amqp://localhost:5672` |
| `PORT`            | HTTP server port           | `3000`                  |

## Available Scripts

- `pnpm dev` - Development server with hot reload
- `pnpm consumer` - Run event consumer for queue processing
- `pnpm test` - Run test suite
- `pnpm build` - Build TypeScript
- `pnpm lint` - Run linter
- `pnpm cleanup:queues` - Clean RabbitMQ queues

## Architecture

The system uses a modular architecture with:

- **WebhookManager**: Central orchestrator
- **MoodleWebhookServer**: HTTP endpoint handler
- **EventProcessingContext**: Strategy pattern for processing modes
- **RabbitMQService**: Message queue integration
- **ConfigManager**: Centralized configuration management

## Notes

This README covers the essential information for getting started with the Moodle webhooks service. The system is designed for scalability with support for both development and production deployments through Docker containerization and flexible processing strategies.

Wiki pages you might want to explore:

- [Overview (Design4Futures/moodle-webhooks-service)](/wiki/Design4Futures/moodle-webhooks-service#1)
- [Getting Started (Design4Futures/moodle-webhooks-service)](/wiki/Design4Futures/moodle-webhooks-service#2)
- [Docker Deployment (Design4Futures/moodle-webhooks-service)](/wiki/Design4Futures/moodle-webhooks-service#2.3)

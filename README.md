# Serviço de Webhooks do Moodle

Um serviço Node.js/TypeScript escalável para processar eventos webhook de instâncias do Sistema de Gerenciamento de Aprendizagem Moodle com suporte para múltiplas estratégias de processamento e filas de mensagens RabbitMQ.oodle Webhooks Service

A scalable Node.js/TypeScript service for processing webhook events from Moodle Learning Management System instances with support for multiple processing strategies and RabbitMQ message queuing.

## Recursos

- **Múltiplos Modos de Processamento**: Estratégias de processamento Direto, Fila e Híbrido para diferentes cenários de implantação
- **Integração RabbitMQ**: Processamento assíncrono de mensagens com lógica de reprocessamento e filas de cartas mortas
- **Manipulação de Eventos**: Manipuladores abrangentes para eventos do Moodle como criação de usuário, conclusão de curso e matrículas
- **Suporte Docker**: Implantação completamente containerizada com Docker Compose
- **Segurança**: Limitação de taxa, CORS e validação de segredo de webhook

## Início Rápido

### Pré-requisitos

- Node.js 18+
- pnpm (recomendado) ou npm
- RabbitMQ (opcional, para processamento de filas)
- Instância Moodle com capacidade de webhook

### Instalação

```bash
# Clone o repositório
git clone https://github.com/Design4Futures/moodle-webhooks-service.git
cd moodle-webhooks-service

# Instale as dependências
pnpm install
```

### Configuração

1. Copie o template de ambiente:

```bash
cp .env.example .env
```

2. Configure suas variáveis de ambiente:

```env
MOODLE_BASE_URL=https://seu-site-moodle.com
MOODLE_TOKEN=seu-token-webservice-moodle
WEBHOOK_SECRET=sua-chave-secreta-webhook
PROCESSING_MODE=hybrid
```

### Executando o Serviço

**Modo de desenvolvimento:**

```bash
pnpm dev
```

**Modo de produção:**

```bash
pnpm build
pnpm start
```

**Com Docker:**

```bash
docker-compose up -d
```

## Modos de Processamento

O serviço suporta três estratégias de processamento:

- **Direto** (`PROCESSING_MODE=direct`): Processamento síncrono de eventos
- **Fila** (`PROCESSING_MODE=queue`): Processamento assíncrono via RabbitMQ
- **Híbrido** (`PROCESSING_MODE=hybrid`): Fila primeiro com fallback direto (recomendado)

## Manipuladores de Eventos

O sistema inclui manipuladores para eventos comuns do Moodle:

- Criação de usuário
- Matrícula e conclusão de curso
- Envios de tarefas

## Implantação Docker

O projeto inclui uma configuração Docker completa com RabbitMQ:

```bash
# Inicie todos os serviços
docker-compose up -d

# Acesse a UI de Gerenciamento do RabbitMQ
open http://localhost:15672
# Usuário: admin, Senha: admin123
```

## Configuração

Opções de configuração principais via variáveis de ambiente:

| Variável           | Descrição                  | Padrão                   |
| ------------------- | ---------------------------- | ------------------------- |
| `MOODLE_BASE_URL` | URL da instância Moodle     | Obrigatório              |
| `MOODLE_TOKEN`    | Token do serviço web        | Obrigatório              |
| `PROCESSING_MODE` | Estratégia de processamento | `hybrid`                |
| `RABBITMQ_URL`    | String de conexão RabbitMQ  | `amqp://localhost:5672` |
| `PORT`            | Porta do servidor HTTP       | `3000`                  |

## Scripts Disponíveis

- `pnpm dev` - Servidor de desenvolvimento com hot reload
- `pnpm consumer` - Executar consumidor de eventos para processamento de filas
- `pnpm test` - Executar suíte de testes
- `pnpm build` - Compilar TypeScript
- `pnpm lint` - Executar linter
- `pnpm cleanup:queues` - Limpar filas RabbitMQ

## Arquitetura

O sistema usa uma arquitetura modular com:

- **WebhookManager**: Orquestrador central
- **MoodleWebhookServer**: Manipulador de endpoint HTTP
- **EventProcessingContext**: Padrão Strategy para modos de processamento
- **RabbitMQService**: Integração de fila de mensagens
- **ConfigManager**: Gerenciamento de configuração centralizado

## Notas

Este README cobre as informações essenciais para começar com o serviço de webhooks do Moodle. O sistema é projetado para escalabilidade com suporte para implantações de desenvolvimento e produção através de containerização Docker e estratégias de processamento flexíveis.

Páginas da wiki que você pode querer explorar:

- [Visão Geral (Design4Futures/moodle-webhooks-service)](/wiki/Design4Futures/moodle-webhooks-service#1)
- [Primeiros Passos (Design4Futures/moodle-webhooks-service)](/wiki/Design4Futures/moodle-webhooks-service#2)
- [Implantação Docker (Design4Futures/moodle-webhooks-service)](/wiki/Design4Futures/moodle-webhooks-service#2.3)

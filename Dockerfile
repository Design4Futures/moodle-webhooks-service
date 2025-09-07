### Builder image
FROM node:20-alpine AS builder

RUN apk add --no-cache python3 make g++ git

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy only package manifests first for better caching
COPY package.json pnpm-lock.yaml ./
COPY tsconfig.json .

RUN pnpm fetch --no-frozen-lockfile || true

# Install deps

# Install dependencies (dev and prod) for build
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY . .
RUN pnpm run build

### Production image
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy runtime deps from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

EXPOSE ${PORT:-3000}

# Use a small Node-based healthcheck to avoid adding extra packages
HEALTHCHECK --interval=30s --timeout=10s --retries=5 CMD node -e "const http=require('http');const p=process.env.PORT||3000;const req=http.get({host:'127.0.0.1',port:p,path:'/health',timeout:5000},res=>{if(res.statusCode===200)process.exit(0);else process.exit(1)});req.on('error',()=>process.exit(1));req.on('timeout',()=>{req.destroy();process.exit(1)})"

CMD ["node", "dist/core/WebhookManager.js"]

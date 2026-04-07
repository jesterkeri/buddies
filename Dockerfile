FROM node:23-slim AS base

RUN apt-get update && apt-get install -y \
  python3 make g++ git \
  && rm -rf /var/lib/apt/lists/*

ENV ELIZAOS_TELEMETRY_DISABLED=true
ENV DO_NOT_TRACK=1

WORKDIR /app

# Install bun
RUN npm install -g bun

# Install elizaos CLI and add to PATH
RUN bun install -g @elizaos/cli
ENV PATH="/root/.bun/bin:${PATH}"

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile || bun install

COPY . .

# Build backend
RUN bun run build

# Build frontend and replace built-in ElizaOS client
RUN cd frontend && bun install && bun run build
RUN cp -r frontend/dist/* node_modules/@elizaos/server/dist/client/

RUN mkdir -p /app/data

# ElizaOS on 3000, config server on 3001
EXPOSE 3000 3001

ENV NODE_ENV=production
ENV SERVER_PORT=3000

CMD ["elizaos", "start"]

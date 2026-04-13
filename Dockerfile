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

# Build frontend and replace built-in ElizaOS client (both possible serve paths)
RUN cd frontend && bun install && bun run build
RUN cp -r frontend/dist/* node_modules/@elizaos/server/dist/client/
RUN if [ -d frontend/node_modules/@elizaos/server/dist/client ]; then cp -r frontend/dist/* frontend/node_modules/@elizaos/server/dist/client/; fi

RUN mkdir -p /app/data

# ElizaOS on 3000. Config server (port 3001) is bound to 127.0.0.1 by default
# and should NOT be exposed publicly — it has no auth and stores API keys.
# To expose it (e.g., Nosana with reverse-proxy + auth), set
# BUDDIES_CONFIG_BIND_HOST=0.0.0.0 and add `EXPOSE 3001` here.
EXPOSE 3000

ENV NODE_ENV=production
ENV SERVER_PORT=3000

COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh
CMD ["/app/start.sh"]

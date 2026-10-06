FROM node:24-bookworm-slim
WORKDIR /app
RUN npm install --global pnpm@11.19.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN VITE_BACKEND_ENABLED=true pnpm build:server
RUN mkdir -p /app/data && chown -R node:node /app/data
USER node
ENV NODE_ENV=production PORT=3001 DATABASE_PATH=/app/data/mida.sqlite
EXPOSE 3001
CMD ["node", "server/index.mjs"]

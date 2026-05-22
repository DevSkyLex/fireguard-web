FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY angular.json tsconfig*.json .postcssrc.json ./
COPY public ./public
COPY src ./src

ARG APP_API_URL=http://localhost:8000
ARG APP_MERCURE_HUB_URL=http://localhost:3000/.well-known/mercure
ARG APP_NAME=Fireguard
ARG APP_MAINTENANCE=false

RUN APP_API_URL="$APP_API_URL" \
  APP_MERCURE_HUB_URL="$APP_MERCURE_HUB_URL" \
  APP_NAME="$APP_NAME" \
  APP_MAINTENANCE="$APP_MAINTENANCE" \
  node -e 'const fs = require("node:fs"); const env = (name, fallback) => { const value = (process.env[name] ?? "").trim(); return value && !["none", "null"].includes(value.toLowerCase()) ? value : fallback; }; const maintenanceValue = env("APP_MAINTENANCE", "false").toLowerCase(); const maintenance = maintenanceValue === "true"; const fileContent = `import { type EnvironmentConfig } from "@core/config/environment";\n\n/**\n * Environment production\n * @type {EnvironmentConfig}\n *\n * @description\n * This file is generated during the Docker image build.\n */\nexport const environment: EnvironmentConfig = {\n  production: true,\n  apiUrl: ${JSON.stringify(env("APP_API_URL", "http://localhost:8000"))},\n  appName: ${JSON.stringify(env("APP_NAME", "Fireguard"))},\n  mercureHubUrl: ${JSON.stringify(env("APP_MERCURE_HUB_URL", "http://localhost:3000/.well-known/mercure"))},\n  maintenance: ${maintenance},\n};\n`; fs.writeFileSync("src/environments/environment.ts", fileContent, "utf8");'

RUN npm run build

FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY --from=build /app/dist ./dist

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 4000) + '/').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "dist/fireguard-web/server/server.mjs"]

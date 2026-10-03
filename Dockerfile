FROM node:22-alpine@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402 AS build

WORKDIR /app

RUN npm install --global npm@11.16.0 --ignore-scripts --no-audit --no-fund

COPY package.json package-lock.json ./
RUN npm ci

COPY angular.json tsconfig*.json .postcssrc.json ngsw-config.json ./
COPY public ./public
COPY src ./src

RUN npm run build

FROM node:22-alpine@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402 AS runtime

WORKDIR /app

RUN npm install --global npm@11.16.0 --ignore-scripts --no-audit --no-fund

ENV NODE_ENV=production
ENV PORT=4000

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY --from=build /app/dist ./dist

USER node

STOPSIGNAL SIGTERM

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 4000) + '/healthz').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "dist/fireguard-web/server/server.mjs"]

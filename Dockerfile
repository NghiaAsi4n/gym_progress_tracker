# syntax=docker/dockerfile:1

ARG NODE_VERSION=24.17.0-alpine3.23

FROM node:${NODE_VERSION} AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json

RUN npm ci --ignore-scripts

COPY tsconfig.base.json ./
COPY apps/api apps/api
COPY apps/web apps/web
COPY packages/contracts packages/contracts

ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build

FROM node:${NODE_VERSION} AS production-dependencies

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json

RUN npm ci --omit=dev --ignore-scripts \
  && npm cache clean --force

FROM node:${NODE_VERSION} AS runtime

ENV NODE_ENV=production
ENV PORT=4000

WORKDIR /app

COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=production-dependencies --chown=node:node /app/apps/api/package.json ./apps/api/package.json
COPY --from=production-dependencies --chown=node:node /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=production-dependencies --chown=node:node /app/packages/contracts/package.json ./packages/contracts/package.json
COPY --from=build --chown=node:node /app/apps/api/dist ./apps/api/dist
COPY --from=build --chown=node:node /app/apps/web/dist ./apps/web/dist
COPY --from=build --chown=node:node /app/packages/contracts/dist ./packages/contracts/dist

USER node

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || '4000') + '/api/v1/health').then((response) => { if (!response.ok) process.exit(1); }).catch(() => process.exit(1));"

CMD ["node", "apps/api/dist/server.js"]

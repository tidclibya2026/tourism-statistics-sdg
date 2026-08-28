FROM node:22.16.0-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate
WORKDIR /app

FROM base AS dependencies
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN pnpm install --frozen-lockfile

FROM dependencies AS build
ARG VITE_AUTH_PROVIDER=manus
ARG VITE_AUTH_CLIENT_ID
ARG VITE_APP_ID
ARG VITE_OAUTH_PORTAL_URL
ARG VITE_OIDC_AUTHORIZATION_URL
ARG VITE_STORAGE_PUBLIC_BASE_URL=/manus-storage
ARG VITE_ANALYTICS_ENDPOINT
ARG VITE_ANALYTICS_WEBSITE_ID
ENV VITE_AUTH_PROVIDER=$VITE_AUTH_PROVIDER
ENV VITE_AUTH_CLIENT_ID=$VITE_AUTH_CLIENT_ID
ENV VITE_APP_ID=$VITE_APP_ID
ENV VITE_OAUTH_PORTAL_URL=$VITE_OAUTH_PORTAL_URL
ENV VITE_OIDC_AUTHORIZATION_URL=$VITE_OIDC_AUTHORIZATION_URL
ENV VITE_STORAGE_PUBLIC_BASE_URL=$VITE_STORAGE_PUBLIC_BASE_URL
ENV VITE_ANALYTICS_ENDPOINT=$VITE_ANALYTICS_ENDPOINT
ENV VITE_ANALYTICS_WEBSITE_ID=$VITE_ANALYTICS_WEBSITE_ID
COPY . .
RUN pnpm build

FROM dependencies AS migration
COPY drizzle.config.ts ./
COPY drizzle ./drizzle
CMD ["pnpm", "db:migrate"]

FROM base AS production-dependencies
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN pnpm install --prod --frozen-lockfile

FROM node:22.16.0-bookworm-slim AS runtime
ENV NODE_ENV=production
ENV PORT=3000
ENV READINESS_TIMEOUT_MS=3000
ENV SHUTDOWN_TIMEOUT_MS=10000
WORKDIR /app
RUN apt-get update \
    && apt-get upgrade -y --no-install-recommends \
    && groupadd --system --gid 10001 tourism \
    && useradd --system --uid 10001 --gid tourism --home-dir /app --shell /usr/sbin/nologin tourism \
    && rm -rf \
      /var/lib/apt/lists/* \
      /usr/local/lib/node_modules/npm \
      /usr/local/lib/node_modules/corepack \
      /usr/local/bin/npm \
      /usr/local/bin/npx \
      /usr/local/bin/corepack \
      /usr/local/bin/pnpm \
      /usr/local/bin/pnpx
COPY --from=production-dependencies --chown=tourism:tourism /app/node_modules ./node_modules
COPY --from=build --chown=tourism:tourism /app/dist ./dist
COPY --from=build --chown=tourism:tourism /app/package.json ./package.json
USER tourism
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 CMD ["node", "-e", "fetch('http://127.0.0.1:'+process.env.PORT+'/healthz').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]
CMD ["node", "dist/index.js"]

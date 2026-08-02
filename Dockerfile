# Techno-Commercial Assessment — image for the HR platform (hr.rdcc.ai/techno)
#
# BASE_PATH must be a BUILD arg: Next.js bakes basePath into the bundle at
# build time, so passing it only at runtime would not work.
FROM node:20-bookworm-slim AS builder

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --include=dev

COPY . .

ARG BASE_PATH=""
ENV BASE_PATH=${BASE_PATH}
RUN npm run build

# ── Runtime ──────────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# next.config.ts is re-evaluated when the server starts, so the prefix must be
# present at RUNTIME as well as at build time — otherwise the server routes at
# "/" while the prebuilt HTML points at "/techno/_next/...".
ARG BASE_PATH=""
ENV BASE_PATH=${BASE_PATH}

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Question banks are read at runtime from data/ — they are committed, so no
# Python is needed on the server.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/data ./data

ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]

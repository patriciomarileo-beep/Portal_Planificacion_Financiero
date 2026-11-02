# Digests verified against official registries on 2026-10-21. Refresh and scan at least weekly.
FROM node:22-trixie-slim@sha256:2e40f0b0227d54ea99362e190cc13331f023fc1eef064d3d73d23d9434e8b86f AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY scripts/apply-security-patches.mjs ./scripts/
COPY patches ./patches/
RUN npm ci

FROM deps AS builder
ENV NEXT_TELEMETRY_DISABLED=1
COPY . .
RUN npm run build:cloudrun

# No shell, package manager or root user in the runtime image.
FROM gcr.io/distroless/nodejs22-debian13:nonroot@sha256:6c19627684167feb45e7ab0b4938e01a4922fc4abd9abd430df07606a6ab0e26 AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=8080
COPY --from=builder --chown=65532:65532 /app/.next/standalone ./
COPY --from=builder --chown=65532:65532 /app/public ./public
COPY --from=builder --chown=65532:65532 /app/.next/static ./.next/static
COPY --from=builder --chown=65532:65532 /app/private-data ./private-data
USER 65532:65532
EXPOSE 8080
CMD ["server.js"]

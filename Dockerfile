# ─────────────────────────────────────────────────────────────
# AVTPP — single-image build: Express API + built React frontend
# ─────────────────────────────────────────────────────────────

# Stage 1: build the React (Vite) client
FROM node:20-alpine AS client
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: server runtime
FROM node:20-alpine
WORKDIR /app/server
ENV NODE_ENV=production
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server/ ./
# Express serves ../client/dist (see server.js)
COPY --from=client /app/client/dist /app/client/dist

# Drop root privileges — run as the unprivileged `node` user baked into the
# official image. Ownership is fixed first so the app can read its own files.
RUN chown -R node:node /app
USER node

EXPOSE 5000

# Container-level liveness probe (complements Render's healthCheckPath).
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||5000)+'/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "server.js"]

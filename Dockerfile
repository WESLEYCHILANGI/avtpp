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

EXPOSE 5000
CMD ["node", "server.js"]

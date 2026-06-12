# Stage 1: build the Vite client and compile the Express server
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/

RUN npm ci

COPY client ./client
COPY server ./server

RUN npm run build -w client && npm run build -w server

# Stage 2: production runtime
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV UPLOAD_DIR=/app/uploads
ENV MAX_UPLOAD_SIZE=5000

COPY package.json package-lock.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/

RUN npm ci --omit=dev --workspace=server

COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/server/dist ./server/dist

EXPOSE 3000

CMD ["node", "server/dist/index.js"]

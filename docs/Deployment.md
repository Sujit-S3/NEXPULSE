# Deployment

---

## Prerequisites

- **MongoDB Atlas** account with a cluster created
- **Node.js** 22+ (for local builds)
- **Vercel** account (for client SPA hosting)
- **Render** account (for server hosting)
- **Cloudinary** account (for media storage, optional)
- **GitHub** repository (for CI/CD)

---

## Environment Variables

See [ENVIRONMENT.md](./ENVIRONMENT.md) for the complete reference.

For production, you must configure:

| Variable | Required | Source |
|---|---|---|
| `MONGO_URI` | Yes | MongoDB Atlas connection string |
| `JWT_ACCESS_SECRET` | Yes | Generate with `openssl rand -hex 64` |
| `COOKIE_SECRET` | Yes | Generate with `openssl rand -hex 32` |
| `IDENTITY_ENCRYPTION_KEY` | Yes | Generate with `openssl rand -hex 32` |
| `CORS_ORIGIN` | Yes | Your Vercel deployment URL |
| `CLOUDINARY_CLOUD_NAME` | No | Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | No | Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | No | Cloudinary dashboard |

---

## Server Deployment (Render)

### Setup

1. Create a **Web Service** on Render
2. Connect your GitHub repository
3. Configure:

| Setting | Value |
|---|---|
| **Name** | `nexpulse-api` |
| **Runtime** | Node |
| **Build Command** | `npm install && npm run build:server` |
| **Start Command** | `npm --prefix server run start` |
| **Root Directory** | (not set — use repo root) |
| **Health Check Path** | `/api/v1/health` |

### Environment Variables (Render Dashboard)

Add all variables from [ENVIRONMENT.md](./ENVIRONMENT.md#server) under the "Environment" section.

Key production values:
```
NODE_ENV=production
PORT=10000
CORS_ORIGIN=https://nexpulse.vercel.app
MONGO_URI=mongodb+srv://...
```

### Health Check

Render will ping `/api/v1/health` at the configured interval. Success response:
```json
{ "success": true, "data": { "status": "healthy", "database": "connected", ... } }
```

---

## Client Deployment (Vercel)

### Setup

1. Create a new project on Vercel
2. Import your GitHub repository
3. Set **Root Directory** to `client`
4. Configure:

| Setting | Value |
|---|---|
| **Framework Preset** | Vite |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |

### Environment Variables (Vercel Dashboard)

| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://nexpulse-api.onrender.com` |

### SPA Rewrites

Add the following to your Vercel project settings under **Rewrites**:

```json
[
  { "source": "/((?!api/).*)", "destination": "/index.html" }
]
```

Or create `client/vercel.json`:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

---

## CI/CD with GitHub Actions

Create `.github/workflows/deploy.yml` at the repository root:

```yaml
name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  quality:
    name: Quality Checks
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'

      - run: npm run install:all
      - run: npm run typecheck
      - run: npm run lint

      - name: Run server tests
        working-directory: server
        run: npm test

      - name: Run client tests
        working-directory: client
        run: npm test

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: quality
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'

      - run: npm run install:all
      - run: npm run build

  deploy-server:
    name: Deploy Server
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Render
        uses: johnbeynon/render-deploy-action@v0.0.8
        with:
          service-id: ${{ secrets.RENDER_SERVICE_ID }}
          api-key: ${{ secrets.RENDER_API_KEY }}
```

---

## Docker Setup

### Server (multi-stage build)

Create `server/Dockerfile`:

```dockerfile
# ---- Build stage ----
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# ---- Production stage ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
RUN npm install --omit=dev

EXPOSE 10000
CMD ["node", "dist/index.js"]
```

### Client (nginx)

Create `client/Dockerfile`:

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Create `client/nginx.conf`:

```nginx
server {
  listen 80;
  server_name _;
  root /usr/share/nginx/html;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location /api/ {
    proxy_pass http://backend:10000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }
}
```

### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:7
    command: ["mongod", "--replSet", "rs0", "--bind_ip_all"]
    ports:
      - '27017:27017'
    volumes:
      - mongo-data:/data/db
    healthcheck:
      test: mongosh --quiet --eval "try { rs.status().ok } catch (error) { rs.initiate({_id:'rs0',members:[{_id:0,host:'mongodb:27017'}]}).ok }"
      interval: 10s
      timeout: 5s
      retries: 10

  server:
    build:
      context: ./server
    ports:
      - '10000:10000'
    environment:
      NODE_ENV: production
      PORT: 10000
      MONGO_URI: mongodb://mongodb:27017/nexpulse?replicaSet=rs0
      JWT_ACCESS_SECRET: ${JWT_ACCESS_SECRET}
      COOKIE_SECRET: ${COOKIE_SECRET}
      IDENTITY_ENCRYPTION_KEY: ${IDENTITY_ENCRYPTION_KEY}
      CORS_ORIGIN: http://localhost:80
    depends_on:
      mongodb:
        condition: service_healthy

  client:
    build:
      context: ./client
    ports:
      - '80:80'
    depends_on:
      - server

volumes:
  mongo-data:
```

---

## Monitoring & Logging

### Server Logging

- **Format:** Structured JSON via Winston
- **Log Levels:** `error`, `warn`, `info`, `debug` (configurable via `LOG_LEVEL`)
- **HTTP Logging:** Morgan streams to Winston for request/response logging
- **Output:** stdout (captured by Render/Vercel logging)

### Health Checks

- **`/api/v1/health`** — Full health check (server + database status, uptime, memory)
- **`/api/v1/ready`** — Readiness probe for orchestrators (returns 503 if DB disconnected)

### Recommended Production Monitoring

- **Render Dashboard** — Built-in logs, metrics, and alerts
- **MongoDB Atlas** — Built-in monitoring for database performance
- **Sentry** — Error tracking (add to both client and server)
- **Better Stack / Logtail** — Centralized log aggregation

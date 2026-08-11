# NEXPULSE AI

**The Pulse of Every Platform.**

AI-powered social media analytics platform — monitor platforms, visualize analytics, receive AI recommendations, generate reports, and manage teams — all from one luxurious dashboard.

---

## Project Overview

NEXPULSE AI is a full-stack TypeScript web application that provides unified social media analytics. It connects to multiple social platforms, aggregates engagement data, and surfaces AI-powered insights through a polished glass-morphism dashboard.

This project is ready for **production deployment**. Beyond the original social analytics core, the platform now includes a full identity/RBAC/MFA system, a developer platform (OAuth apps, webhooks, API keys, plugin marketplace), subscription billing (Razorpay), and an enterprise security control plane (zero-trust policy engine, DLP, threat detection, compliance evidence) — see [Architecture](#architecture) and [docs/identity-platform.md](docs/identity-platform.md) for details.

---

## Architecture

| Layer       | Tech                                                        |
|-------------|-------------------------------------------------------------|
| Frontend    | React 19, TypeScript, Vite, Tailwind CSS 4, shadcn/ui, Framer Motion, TanStack Query, React Router, Axios |
| Backend     | Node.js, Express, MongoDB Atlas, Mongoose, JWT, Redis + BullMQ (background job queue) |
| Deployment  | Vercel (frontend) · Render (backend) · MongoDB Atlas (DB) · Cloudinary (storage) |

### High-Level Architecture

```
┌─────────────────┐      HTTP/REST       ┌──────────────────┐
│  React Client   │ ◄──────────────────► │  Express Server  │
│  (Vite + TS)    │                      │  (Node.js + TS)  │
└─────────────────┘                      └──────────────────┘
                                                │
                                                ▼
                                          ┌──────────────┐
                                          │   MongoDB    │
                                          │   (Mongoose) │
                                          └──────────────┘
```

---

## Technology Stack

### Client
- **React 19** — UI framework with concurrent features
- **TypeScript 5.7** — Type safety
- **Vite 6** — Lightning-fast build tool
- **Tailwind CSS 4** — Utility-first styling
- **Framer Motion** — Declarative animations
- **TanStack Query v5** — Server state management
- **React Router v6** — Client-side routing
- **Zustand** — Lightweight client state
- **Axios** — HTTP client
- **Zod** — Schema validation
- **shadcn/ui** — Component library (glass-themed)
- **Lucide React** — Icon library

### Server
- **Node.js** — Runtime
- **Express** — HTTP framework
- **MongoDB + Mongoose** — Database + ODM
- **Redis + BullMQ** — Background job queue (webhook delivery, security jobs, queued email); monitoring dashboard via bull-board at `/api/v1/developer/queues`
- **JWT** — Authentication tokens
- **Bcrypt** — Password hashing
- **Cloudinary** — Media storage
- **Helmet** — Security headers
- **Express Rate Limit** — Rate limiting

---

## Folder Structure

```
nexpulse-ai/
├── client/                    # React SPA (Vite)
│   ├── public/                # Static assets
│   └── src/
│       ├── components/        # UI components (layout, glass primitives, identity, platforms, get-started, landing, effects...)
│       ├── contexts/          # React contexts (AuthContext)
│       ├── features/          # Feature modules: ai, billing, core, developer, personalization, security
│       ├── hooks/             # Shared custom hooks (useAuth, ...)
│       ├── lib/                # Third-party configurations
│       │   ├── axios.ts        # Axios instance (auth interceptors, refresh/retry)
│       │   ├── motion.ts       # Framer Motion presets
│       │   └── query.ts        # QueryClient config
│       ├── pages/               # 24 page components (Dashboard, Analytics, Platforms, AI, Billing, Developer, Security, Reports, Team, Settings, Notifications, Profile, auth pages, ...)
│       ├── routes/              # Router configuration
│       ├── services/            # Auth/identity API clients
│       ├── theme/               # Theme system
│       ├── types/               # TypeScript types
│       └── utils/                # Utility functions
├── server/                    # Express API
│   ├── src/
│   │   ├── config/              # Environment validation (Zod)
│   │   ├── middleware/          # Auth, authorization, rate limiting, validation, error handling
│   │   ├── modules/             # One folder per domain, each with routes/controller/service/model/validator:
│   │   │                        # ai, analytics, auth, billing, dashboard, developer, identity,
│   │   │                        # notifications, platforms, reports, security, settings, workspaces
│   │   ├── operations/          # Readiness, metrics, monitoring
│   │   ├── routes/              # Versioned route mounting (v1)
│   │   ├── scripts/             # Runtime config validation, migrations
│   │   └── utils/               # JWT, API response, pagination
│   └── tests/                   # Unit + integration tests (Vitest + Supertest)
├── shared/                    # Shared code (client + server)
│   ├── types/                  # Shared TypeScript types
│   ├── schemas/                 # Shared Zod schemas
│   └── constants/               # Shared constants
├── sdks/                       # Published client SDKs (subset of the API surface)
│   ├── typescript/              # @nexpulse/sdk
│   └── python/                  # nexpulse
├── e2e/                        # Playwright end-to-end specs
├── scripts/                    # Security scans, backups, brand-asset verification
├── docs/                      # Documentation
│   ├── Architecture.md
│   ├── Roadmap.md
│   ├── Database.md
│   ├── API.md
│   ├── DesignSystem.md
│   ├── Deployment.md
│   ├── ENVIRONMENT.md
│   ├── identity-platform.md
│   ├── SECURITY_REVIEW.md
│   ├── Contributing.md
│   └── CodingStandards.md
├── package.json               # Root workspace scripts
├── LICENSE
├── CHANGELOG.md
├── CODE_OF_CONDUCT.md
└── SECURITY.md
```

---

## Getting Started

### Prerequisites

- **Node.js** 20+
- **npm** 10+
- **MongoDB** (local or Atlas URI)
- **Git**

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd nexpulse-ai

# Install all dependencies (root + client + server)
npm run install:all
```

### Environment Setup

```bash
# Server environment
cp server/.env.example server/.env
# Edit server/.env with your values

# Client environment (optional — defaults work for local dev)
cp client/.env.example client/.env
```

### Running Locally

```bash
# Start both client and server (concurrently)
npm run dev
```

- **Client**: `http://localhost:5174`
- **Server**: `http://localhost:4000`

---

## Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both client and server in dev mode |
| `npm run dev:client` | Start client only |
| `npm run dev:server` | Start server only |
| `npm run install:all` | Install all dependencies |
| `npm run build` | Build both client and server |
| `npm run build:client` | Build client only |
| `npm run build:server` | Build server only |
| `npm run lint` | Lint both packages |
| `npm run lint:fix` | Fix lint issues |
| `npm run typecheck` | Type-check both packages |
| `npm run clean` | Remove all node_modules |

---

## Deployment

### Prerequisites

- **MongoDB Atlas** cluster (free tier works)
- **Render** account (backend hosting)
- **Vercel** account (frontend hosting)
- **GitHub** repository

### MongoDB Atlas Setup

1. Create a free cluster at [mongodb.com](https://mongodb.com)
2. Create a database user (username + password)
3. Whitelist all IPs (`0.0.0.0/0`) or Render's IP ranges
4. Get your connection string: `mongodb+srv://<user>:<pass>@<cluster>.xxxxx.mongodb.net/nexpulse?retryWrites=true&w=majority`

### Backend Deployment (Render)

1. Push your code to GitHub
2. On Render, create a **New Web Service** and connect your repository
3. Render detects `render.yaml` — or configure manually:
   - **Root Directory**: `server`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/api/v1/health`
4. Add required environment variables (see [Environment Variables](#environment-variables))
5. Deploy

### Frontend Deployment (Vercel)

1. On Vercel, create a **New Project** and import your repository
2. Configure:
   - **Root Directory**: `client`
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
3. Add environment variable: `VITE_API_URL` = your Render backend URL
4. Deploy

### CI/CD Pipeline

The project includes GitHub Actions workflows:

| File | Purpose |
|------|---------|
| `.github/workflows/ci.yml` | Lint, typecheck, test, and build on every PR/push |
| `.github/workflows/deploy.yml` | Deploy to Render + Vercel on push to `main` |

To enable deployment:

1. **Render**: Add `RENDER_SERVICE_ID` and `RENDER_API_KEY` to GitHub Secrets
2. **Vercel**: Add `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` to GitHub Secrets

### Environment Variables

#### Server (Render)

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | Set to `production` |
| `PORT` | Yes | Set to `10000` |
| `MONGO_URI` | Yes | MongoDB Atlas connection string |
| `JWT_ACCESS_SECRET` | Yes | Generate with `openssl rand -hex 64` |
| `COOKIE_SECRET` | Yes | Generate with `openssl rand -hex 32` |
| `IDENTITY_ENCRYPTION_KEY` | Yes | Generate with `openssl rand -hex 32` |
| `CORS_ORIGIN` | Yes | Your Vercel frontend URL |
| `APP_URL` | Yes | Your Render backend URL |
| `CLIENT_URL` | Yes | Your Vercel frontend URL |
| `DEFAULT_AI_PROVIDER` | No | `auto`, `openai`, `gemini`, or `anthropic` |
| `GEMINI_API_KEY` | No | Required if using Gemini |
| `OPENAI_API_KEY` | No | Required if using OpenAI |
| `ANTHROPIC_API_KEY` | No | Required if using Anthropic |
| `LOG_LEVEL` | No | `info` for dev, `warn` for production |

#### Client (Vercel)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | Yes | Your Render backend URL (e.g. `https://nexpulse-api.onrender.com`) |

### Production Checklist

- [ ] Generate fresh `JWT_ACCESS_SECRET`, `COOKIE_SECRET`, and `IDENTITY_ENCRYPTION_KEY`
- [ ] Set `NODE_ENV=production` on Render
- [ ] Set `COOKIE_SECURE=true` (auto-enabled in production)
- [ ] Configure `CORS_ORIGIN` to your Vercel URL
- [ ] Configure `MONGO_URI` with MongoDB Atlas connection string
- [ ] Set `VITE_API_URL` on Vercel to your Render backend URL
- [ ] Configure at least one real AI provider key, or disable AI
- [ ] Enable HTTPS (automatic on Render + Vercel)
- [ ] Monitor health endpoint: `GET /api/v1/health`

### Common Deployment Issues

| Issue | Solution |
|-------|----------|
| Build fails with native binding error | Delete `node_modules` and `package-lock.json`, re-run `npm install` |
| MongoDB connection refused | Check Atlas IP whitelist includes `0.0.0.0/0` |
| CORS errors in browser | Verify `CORS_ORIGIN` matches the Vercel URL exactly |
| 401 on API requests | Verify JWT secrets match between deployments |
| Blank page after deploy | Check Vite build output for errors; verify `VITE_API_URL` is set |
| Rate limiting in production | Adjust `RATE_LIMIT_MAX_REQUESTS` for your expected traffic |
| AI is unavailable | Configure a supported provider key or set `ENABLE_AI=false` |

---

## Future Roadmap

| Phase | Description | Status |
|-------|-------------|--------|
| 0 | Project scaffolding & setup | ✅ Complete |
| 0.5 | Foundation hardening | ✅ Complete |
| 1 | Design system & component library | ✅ Complete |
| 2 | Core features (Dashboard, Analytics, Platforms, Reports) | ✅ Complete |
| 3 | API integration & authentication | ✅ Complete |
| 4 | AI features, team management, notifications | ✅ Complete |
| 5+ | Identity/RBAC/MFA, developer platform, billing (Razorpay), enterprise security control plane (zero-trust policy, DLP, threat detection, compliance evidence) | ✅ Complete |
| 6 | Distributed job queue (BullMQ/Redis) for webhook delivery, security jobs, and queued email; expanded e2e coverage (31 scenarios across 10 spec files) | ✅ Complete |
| — | Plugin execution sandbox, LinkedIn/Pinterest OAuth token revocation | ⏳ Planned |

`docs/Roadmap.md` predates this expanded scope; treat this table and the module list above as authoritative.

---

## License

This project is licensed under the MIT License — see [LICENSE](LICENSE) for details.

---

## Contributing

Contributions are welcome! Please read our [Contributing Guide](docs/Contributing.md) and [Code of Conduct](CODE_OF_CONDUCT.md) before getting started.

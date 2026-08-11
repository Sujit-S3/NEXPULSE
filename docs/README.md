# NEXPULSE

**AI-powered social media analytics platform** — monitor platforms, visualize analytics, receive AI recommendations, generate reports, and manage teams from a single glass-morphism dashboard.

---

## Tech Stack

### Client
| Technology | Purpose |
|---|---|
| React 19 | UI framework with concurrent features |
| Vite 6 | Build tool with HMR |
| TypeScript 5.7 (strict) | Type safety |
| Tailwind CSS 4 | Utility-first styling |
| Zustand 5 | Client-side state management |
| TanStack React Query v5 | Server state & caching |
| Framer Motion 11 | Declarative animations |
| Recharts 3 | Charting library |
| React Router DOM v6 | Client-side routing |
| react-hook-form 7 + Zod 3 | Form validation |
| Axios 1 | HTTP client |
| Lucide React | Icon library |
| class-variance-authority + clsx + tailwind-merge | Component styling utilities |
| Vitest 4 | Testing framework |

### Server
| Technology | Purpose |
|---|---|
| Node.js 22+ | Runtime |
| Express 4 | HTTP framework |
| Mongoose 8 | MongoDB ODM |
| Zod 4 | Schema validation |
| JWT (jsonwebtoken) | Authentication |
| Bcrypt | Password hashing |
| Helmet | Security headers |
| CORS | Cross-origin support |
| Compression | Gzip compression |
| Cookie-parser | Cookie management |
| Morgan + Winston | HTTP logging & structured logging |
| express-rate-limit | Rate limiting |
| Cloudinary | Media storage |
| Multer | File uploads |
| Vitest 4 + Supertest | Testing |
| tsx | TypeScript runtime for development |

---

## Prerequisites

- **Node.js** 22+ (LTS recommended)
- **npm** 10+
- **MongoDB** (local instance or MongoDB Atlas URI)
- **Git**

---

## Quick Start

```bash
# 1. Clone the repository
git clone <repository-url>
cd NEXPULSE

# 2. Install all dependencies (root + client + server)
npm run install:all

# 3. Configure environment variables
cp server/.env.example server/.env
# Edit server/.env with your MongoDB URI, JWT secrets, etc.

cp client/.env.example client/.env
# (optional — defaults work for local dev)

# 4. Start development servers (client + server concurrently)
npm run dev
```

- **Client**: http://localhost:5173
- **Server**: http://localhost:4000
- **API Base URL**: http://localhost:4000/api/v1

---

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start both client and server in dev mode |
| `npm run dev:client` | Start Vite dev server only |
| `npm run dev:server` | Start tsx watch server only |
| `npm run build` | Build both client and server |
| `npm run build:client` | Build client SPA to `client/dist` |
| `npm run build:server` | Compile server TypeScript to `server/dist` |
| `npm run typecheck` | Run tsc --noEmit on both packages |
| `npm run lint` | ESLint check both packages (zero warnings) |
| `npm run lint:fix` | Auto-fix lint issues |
| `npm run clean` | Remove all `node_modules` directories |
| `npm test` (in client or server) | Run Vitest tests |
| `npm run test:watch` (client) | Watch mode tests |
| `npm run test:coverage` (client) | Test coverage report |

---

## Project Structure

```
NEXPULSE/
├── client/                          # React SPA (Vite)
│   ├── src/
│   │   ├── components/              # UI components
│   │   │   ├── common/              # Shared components (ErrorBoundary, ProtectedRoute, toast, skeleton)
│   │   │   ├── glass/               # Glass morphism primitives (Button, Card, Input, Badge, etc.)
│   │   │   ├── layout/              # AppShell, Sidebar, Navbar, MainLayout
│   │   │   ├── landing/             # Landing page sections
│   │   │   ├── dashboard/           # Dashboard-specific components
│   │   │   ├── analytics/           # Analytics page components
│   │   │   ├── effects/             # ScrollReveal, FloatingParticles, AnimatedCounter
│   │   │   └── get-started/         # Onboarding wizard steps
│   │   ├── features/                # Feature modules
│   │   │   ├── core/                # Core feature logic (stores, hooks, providers, services)
│   │   │   └── ai/                  # AI engine (ChatArea, IntelligencePanel, PromptArea)
│   │   ├── pages/                   # Page components (lazy-loaded)
│   │   ├── routes/                  # AppRouter with route definitions
│   │   ├── services/                # API service layer (auth, platforms)
│   │   ├── lib/                     # Library configs (axios, queryClient, motion presets)
│   │   ├── store/                   # Zustand stores (future)
│   │   ├── hooks/                   # Custom hooks (useAuth)
│   │   ├── theme/                   # ThemeProvider, theme config
│   │   ├── contexts/                # AuthContext
│   │   ├── providers/               # React context providers
│   │   ├── config/                  # App configuration (env access)
│   │   ├── constants/               # App-wide constants
│   │   ├── types/                   # TypeScript type definitions
│   │   ├── utils/                   # Utility functions (cn, index)
│   │   ├── motion/                  # Framer Motion re-exports
│   │   ├── styles/                  # Global CSS
│   │   ├── animations/              # Animation components
│   │   └── __tests__/               # Test files
│   ├── public/
│   ├── index.html
│   ├── vite.config.ts
│   └── tsconfig.app.json
├── server/                          # Express API
│   ├── src/
│   │   ├── config/                  # env.ts (Zod-enforced), index.ts
│   │   ├── modules/                 # Feature modules (auth, platforms, ai)
│   │   │   ├── auth/                # Auth module (controller, service, repository, model, routes, validator, types)
│   │   │   ├── platforms/           # Platform connections (controller, service, repository, model, routes, adapters, providers)
│   │   │   └── ai/                  # AI engine (controller, aiService, providerAdapter, promptEngine, toolRegistry)
│   │   ├── middleware/              # requireAuth, validate, errorHandler, rateLimiter, requestId, notFound, morgan
│   │   ├── routes/                  # API route definitions (/v1/health, /v1/ready, /v1/auth, /v1/platforms, /v1/ai)
│   │   ├── controllers/            # Standalone controllers (health)
│   │   ├── errors/                  # Error classes (AppError, ValidationError, AuthenticationError, etc.)
│   │   ├── utils/                   # apiResponse, asyncHandler, jwt, pagination, date
│   │   ├── database/               # MongoDB connection with retry logic
│   │   ├── logger/                  # Winston logger configuration
│   │   ├── cron/                    # Scheduled jobs
│   │   ├── jobs/                    # Background jobs
│   │   ├── queues/                  # Job queues (future)
│   │   ├── models/                  # Additional Mongoose models
│   │   ├── repositories/           # Data access layer
│   │   ├── services/               # Business logic
│   │   ├── shared/                 # Shared server utilities
│   │   └── validators/             # Request validators
│   ├── tests/                       # Integration tests
│   └── tsconfig.json
├── shared/                          # Shared code (client + server)
│   ├── types/                       # Shared TypeScript types
│   ├── schemas/                     # Shared Zod schemas (future)
│   └── constants/                   # Shared constants
├── docs/                            # Documentation
├── package.json                     # Root workspace scripts
└── README.md
```

---

## Key Features

- **Multi-Platform Analytics** — Connect Instagram, Facebook, LinkedIn, TikTok, YouTube, X (Twitter), and Pinterest
- **AI-Powered Insights** — Chat with AI assistant, generate reports, analyze trends, forecast growth
- **Glass-Morphism UI** — Premium design system with glass components and smooth animations
- **Real-Time Data Sync** — Background sync with social platform APIs
- **Team Collaboration** — Role-based access (owner, admin, manager, analyst, viewer)
- **Custom Reports** — Generate and export analytics reports
- **Audience Analysis** — Demographics, geography, device breakdown
- **Content Performance** — Track best/worst performing posts across platforms

---

## Documentation

| Document | Description |
|---|---|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture, data flow, design decisions |
| [API.md](./API.md) | REST API reference with endpoints, schemas, errors |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Deployment guide for Render + Vercel |
| [ENVIRONMENT.md](./ENVIRONMENT.md) | Environment variables reference |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Development workflow, code style, PR process |
| [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) | How-to guide for common development tasks |

---

## License

[MIT](../LICENSE)

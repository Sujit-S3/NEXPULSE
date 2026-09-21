# NEXPULSE AI

**Computer Science & Systems Engineering Student | Full-Stack & AI Developer**

## 1. What the project is
NEXPULSE AI is a full-stack social media analytics and developer platform. It serves as a unified control plane that monitors social platforms, aggregates engagement metrics, and surfaces AI-powered recommendations through a sleek, glass-morphism dashboard.

## 2. What problem it solves
Managing multiple social media channels usually requires switching between disjointed native analytics tools, making it difficult to generate holistic insights. NEXPULSE solves this by providing a centralized dashboard that aggregates cross-platform data, uses AI to suggest optimal posting times and content strategies, and provides an enterprise-like security control plane (including zero-trust policies and data loss prevention) to manage team access.

## 3. What I personally built
I designed and developed the entire application, which includes:
- A polished React 19 frontend utilizing Tailwind CSS and Framer Motion for a premium user experience.
- An Express.js REST API that aggregates data and handles complex identity/RBAC scenarios.
- A background job queue (Redis + BullMQ) for reliable webhook delivery and asynchronous security tasks.
- A robust authentication layer with rotating JWTs and zero-trust policy enforcement.
- Integration with third-party services including Razorpay for subscription billing and Cloudinary for media storage.

## 4. Main features
- **Unified Analytics Dashboard:** Real-time metrics aggregated across multiple social platforms.
- **AI-Powered Recommendations:** Content and engagement strategy suggestions.
- **Identity & RBAC:** Comprehensive role-based access control and team management.
- **Developer Platform:** Support for OAuth apps, webhooks, and API keys.
- **Enterprise Security Plane:** Zero-trust policy engine, Data Loss Prevention (DLP), and threat detection.
- **Subscription Billing:** Fully integrated Razorpay subscription flows.
- **Background Processing:** Redis-backed BullMQ for webhook and email processing.

## 5. Architecture
```mermaid
graph TD
    Client[React Client (Vite + TS)] -->|REST| API[Express Server (Node.js + TS)]
    API --> DB[(MongoDB Atlas)]
    API --> Queue[(Redis + BullMQ)]
    API --> Storage[Cloudinary CDN]
```

## 6. Technology stack
- **Frontend:** React 19, TypeScript, Vite 6, Tailwind CSS 4, shadcn/ui, Framer Motion, TanStack Query, React Router, Zustand
- **Backend:** Node.js, Express, TypeScript, Mongoose, Zod
- **Database & Queues:** MongoDB Atlas, Redis, BullMQ
- **Security:** Helmet, express-rate-limit, Bcrypt, JWT
- **Integrations:** Razorpay (Billing), Cloudinary (Media)

## 7. Demo
*(Add Live Demo link here if available)*

## 8. Screenshots
*(Add screenshots of the Dashboard, Analytics View, and Security Control Plane here)*

## 9. Installation
```bash
git clone https://github.com/Sujit-S3/NEXPULSE.git
cd NEXPULSE

# Install dependencies for both client and server
npm run install:all
```

## 10. Environment variables
**Backend (`server/.env`)**
```env
NODE_ENV=development
PORT=4000
MONGO_URI=mongodb://127.0.0.1:27017/nexpulse
JWT_ACCESS_SECRET=your_jwt_access_secret
COOKIE_SECRET=your_cookie_secret
IDENTITY_ENCRYPTION_KEY=your_encryption_key
CORS_ORIGIN=http://localhost:5174
```

**Frontend (`client/.env`)**
```env
VITE_API_URL=http://localhost:4000/api/v1
```

## 11. Testing
```bash
# Lint and Type-Check
npm run lint
npm run typecheck

# E2E Tests (Playwright)
npm run test:e2e
```

## 12. Deployment
- **Backend (Render):** Deploy the `server/` directory. Set Build Command to `npm install && npm run build` and Start Command to `npm start`.
- **Frontend (Vercel):** Deploy the `client/` directory using the Vite preset. Set `VITE_API_URL` to your deployed backend URL.

# Contributing

---

## Development Setup

```bash
# 1. Clone the repository
git clone <repository-url>
cd NEXPULSE

# 2. Install all dependencies
npm run install:all

# 3. Configure environment
cp server/.env.example server/.env
# Edit server/.env with your MongoDB URI and secrets

# 4. Start development
npm run dev
```

- Client: http://localhost:5173
- Server: http://localhost:4000

---

## Code Style

### TypeScript

- **Strict mode** enabled (`strict: true`) in both client and server
- `verbatimModuleSyntax: true` — use `import type` for type-only imports
- `.js` extensions required in all relative imports (e.g., `'./service.js'` not `'./service'`)
- `noUnusedLocals`, `noUnusedParameters` — no dead code
- Prefer `interface` over `type` for object shapes, `type` for unions/utility types

### Imports

```typescript
// ✅ Correct — import type for type-only imports
import type { Request, Response } from 'express';
import { Router } from 'express';

// ✅ Correct — .js extension for relative imports (server)
import { authService } from './service.js';

// ✅ Correct — path aliases (client)
import { GlassButton } from '@components/glass/GlassButton';
import { useAuth } from '@hooks/useAuth';

// ❌ Wrong — missing .js extension (server)
import { authService } from './service';

// ❌ Wrong — missing import type for type-only
import { Request } from 'express';
```

### Naming Conventions

| Pattern | Convention | Example |
|---|---|---|
| Files | PascalCase for components/modules, camelCase for utilities | `GlassButton.tsx`, `apiResponse.ts` |
| Components | PascalCase | `export function GlassCard() { ... }` |
| Hooks | `use` prefix | `useAuth`, `usePlatforms` |
| Stores | `use` prefix + `Store` | `useAuthStore`, `useAIStore` |
| Services/APIs | camelCase object with method names | `authApi.register()`, `platformsApi.getConnections()` |
| Types/Interfaces | PascalCase | `PlatformConnection`, `AIRequest` |
| Constants | UPPER_SNAKE_CASE | `API_TIMEOUT`, `DEFAULT_PAGE_SIZE` |
| Functions | camelCase | `generateAccessToken`, `connectDatabase` |

### Linting

```bash
# Check (zero warnings required)
npm run lint

# Auto-fix
npm run lint:fix
```

ESLint is configured with:
- TypeScript strict rules (`typescript-eslint`)
- React hooks rules
- JSX accessibility (`eslint-plugin-jsx-a11y`)
- Import ordering (`eslint-plugin-import`)
- Prettier integration for formatting

### Formatting

```bash
cd client && npm run format
```

Prettier is configured with a shared `.prettierrc` (client only). Server follows ESLint formatting rules.

---

## Commit Conventions

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]
```

### Types

| Type | Usage |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Code change that neither fixes nor adds |
| `style` | Formatting, missing semicolons, etc. |
| `docs` | Documentation only |
| `test` | Adding or updating tests |
| `chore` | Build, CI, dependencies |
| `perf` | Performance improvement |

### Examples

```
feat(platforms): add LinkedIn adapter
fix(auth): handle expired refresh token gracefully
refactor(ai): extract prompt builder into separate module
docs(api): add rate limiting documentation
test(dashboard): add AnalyticsCards unit tests
```

---

## PR Process

1. Create a branch from `develop` using the naming convention below
2. Make your changes, keeping commits small and focused
3. Run `npm run typecheck` and `npm run lint` — both must pass with zero errors
4. Run `npm test` in the relevant package — all tests must pass
5. Push your branch and open a pull request to `develop`
6. Ensure the PR description explains the change, links related issues, and includes screenshots for UI changes
7. Request review from at least one maintainer
8. Address feedback with additional commits (do not squash until approved)
9. Once approved, squash-merge into `develop`

### PR Title Format

Same as commit convention: `type(scope): description`

### PR Checklist

- [ ] TypeScript compiles without errors (`npm run typecheck`)
- [ ] Lint passes with zero warnings (`npm run lint`)
- [ ] Tests pass (`npm test`)
- [ ] New code includes tests where applicable
- [ ] New API endpoints include Zod validation
- [ ] UI changes include responsive design consideration
- [ ] Console.log/debugger statements removed
- [ ] No `.env` files or secrets committed

---

## Testing Guidelines

### Server

- **Vitest** with Supertest for integration tests
- Tests in `server/tests/`
- Use `mongodb-memory-server` for database tests
- Test controller responses, service logic, and middleware

### Client

- **Vitest** with jsdom environment
- Tests in `client/src/__tests__/`
- Use `@testing-library/react` for component tests
- `@testing-library/user-event` for user interaction simulation
- Test error states, loading states, and empty states

### Writing Tests

```typescript
// Server integration test example
import { describe, it, expect } from 'vitest';
import supertest from 'supertest';
import { app } from '../src/app.js';

describe('GET /api/v1/health', () => {
  it('returns health status', async () => {
    const res = await supertest(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('healthy');
  });
});
```

---

## Branch Strategy

```
main
  └── develop
        ├── feature/<name>
        ├── fix/<name>
        ├── refactor/<name>
        └── docs/<name>
```

| Branch | Purpose |
|---|---|
| `main` | Production-ready code. Merged from `develop` for releases. |
| `develop` | Integration branch for active development. All PRs target this. |
| `feature/*` | New features. Branch from `develop`, merge back to `develop`. |
| `fix/*` | Bug fixes. Branch from `develop`, merge back to `develop`. |
| `refactor/*` | Code refactoring with no functional changes. |
| `docs/*` | Documentation updates. |

### Branch Naming

Use kebab-case: `feature/ai-streaming`, `fix/auth-refresh-loop`, `docs/api-endpoints`

---

## Additional Resources

- [Architecture Overview](./ARCHITECTURE.md)
- [Developer Guide](./DEVELOPER_GUIDE.md)
- [Coding Standards](./CodingStandards.md) (if available)
- [Code of Conduct](../CODE_OF_CONDUCT.md)

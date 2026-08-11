# Developer Guide

---

## How to Add a New Page

### 1. Create the page component

Create `client/src/pages/MyFeature.tsx`:

```typescript
export function MyFeaturePage() {
  return <div>My Feature</div>;
}
```

### 2. Export from barrel

Add to `client/src/pages/index.ts`:

```typescript
export { MyFeaturePage } from "./MyFeature";
```

### 3. Add route in AppRouter

In `client/src/routes/AppRouter.tsx`:

```typescript
// Add lazy import at top
const MyFeaturePage = lazy(() => import("@pages/MyFeature").then((m) => ({ default: m.MyFeaturePage })));

// Add route
<Route path="/my-feature" element={<Lazy><MyFeaturePage /></Lazy>} />
```

- For public routes: add directly under `<Routes>`
- For authenticated routes: add inside the `<ProtectedRoute><MainLayout></ProtectedRoute>` block

### 4. Add sidebar link (optional)

Update `client/src/components/layout/Sidebar.tsx` with the new navigation item.

---

## How to Add a New API Route

### 1. Create a new module (or add to existing)

```bash
mkdir server/src/modules/myfeature
```

Create the module files with this structure:

```
modules/myfeature/
├── routes.ts       # Route definitions
├── controller.ts   # Request/response handlers
├── service.ts      # Business logic
├── repository.ts   # Database operations
├── model.ts        # Mongoose schema
├── types.ts        # TypeScript types
├── validator.ts    # Zod validation schemas
└── index.ts        # Barrel exports
```

### 2. Register routes

In `server/src/routes/v1/index.ts`:

```typescript
import { myFeatureRoutes } from '../../modules/myfeature/routes.js';

router.use('/myfeature', myFeatureRoutes);
```

### 3. Route example

```typescript
// modules/myfeature/routes.ts
import { Router } from 'express';
import { myFeatureController } from './controller.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { createSchema } from './validator.js';

const router = Router();

router.use(requireAuth);

router.get('/', asyncHandler(myFeatureController.list));
router.post('/', validate(createSchema), asyncHandler(myFeatureController.create));

export { router as myFeatureRoutes };
```

### 4. Controller example

```typescript
// modules/myfeature/controller.ts
import type { Request, Response } from 'express';
import { myFeatureService } from './service.js';
import { apiResponse } from '../../utils/apiResponse.js';

export const myFeatureController = {
  async list(req: Request, res: Response): Promise<void> {
    const data = await myFeatureService.list(req.user!.workspaceId);
    res.json(apiResponse(data));
  },

  async create(req: Request, res: Response): Promise<void> {
    const data = await myFeatureService.create(req.user!.workspaceId, req.body);
    res.status(201).json(apiResponse(data, 'Created successfully'));
  },
};
```

### 5. Always use the standard response format

- Success: `apiResponse(data)` or `apiResponse(data, 'message')`
- Error: Throw an `AppError` subclass (handled by global error handler)
- Use `asyncHandler` wrapper for async controllers

---

## How to Create a New Zustand Store

### 1. Create the store file

In `client/src/features/core/store/myFeatureStore.ts`:

```typescript
import { create } from 'zustand';

interface MyFeatureState {
  items: string[];
  activeId: string | null;
  isLoading: boolean;
  setItems: (items: string[]) => void;
  addItem: (item: string) => void;
  setActiveId: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useMyFeatureStore = create<MyFeatureState>((set) => ({
  items: [],
  activeId: null,
  isLoading: false,
  setItems: (items) => set({ items }),
  addItem: (item) => set((s) => ({ items: [...s.items, item] })),
  setActiveId: (activeId) => set({ activeId }),
  setLoading: (isLoading) => set({ isLoading }),
  reset: () => set({ items: [], activeId: null, isLoading: false }),
}));
```

### 2. Export from barrel

Add to `client/src/features/core/store/index.ts`:

```typescript
export { useMyFeatureStore } from './myFeatureStore';
```

### 3. Store patterns

- **Client-only state only** — server state belongs in React Query
- Always include a `reset()` method for logout/cleanup
- Use `(s) => ({ ... })` callback form when state depends on previous state
- Keep stores flat — avoid nested state objects
- Export as a named export with `use` prefix

---

## How to Add a New Form (react-hook-form + Zod)

### 1. Define the schema

```typescript
import { z } from 'zod';

export const myFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email'),
  quantity: z.coerce.number().min(1).max(1000),
});

export type MyFormData = z.infer<typeof myFormSchema>;
```

### 2. Use in component

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { GlassInput } from '@components/glass/GlassInput';
import { GlassButton } from '@components/glass/GlassButton';

export function MyForm() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<MyFormData>({
    resolver: zodResolver(myFormSchema),
  });

  const onSubmit = async (data: MyFormData) => {
    // handle submission
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <GlassInput label="Name" error={errors.name?.message} {...register('name')} />
      <GlassInput label="Email" error={errors.email?.message} {...register('email')} />
      <GlassButton type="submit" loading={isSubmitting}>Submit</GlassButton>
    </form>
  );
}
```

---

## Component Patterns

### Glass Components

All glass components follow these conventions:

```typescript
// GlassButton pattern
interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  className?: string;
}
```

- Accept `className` for custom styling (merged with `cn()` utility)
- Use CSS custom properties (`var(--color-*)`, `var(--spacing-*)`, `var(--font-size-*)`) for theming
- Support `loading` state with spinner
- Use `focus-visible` for keyboard accessibility
- Use `disabled:pointer-events-none disabled:opacity-50` for disabled state

### Common Component Patterns

```typescript
// ErrorBoundary (class component wrapping children)
<ErrorBoundary><MyComponent /></ErrorBoundary>

// LoadingOverlay (used in Suspense fallback)
<LoadingOverlay label="Loading..." />

// EmptyState
<EmptyState icon={BarChart3} title="No Data" description="Connect a platform to get started" action={{ label: "Connect", onClick: () => {} }} />

// Protected route wrapper
<ProtectedRoute><MainLayout /></ProtectedRoute>
```

---

## State Management Patterns

### React Query for Server State

```typescript
// Hook pattern (features/core/hooks/useMyFeature.ts)
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { myFeatureApi } from '../services/api';

export function useMyFeatureData(workspaceId: string) {
  return useQuery({
    queryKey: ['myFeature', workspaceId],
    queryFn: () => myFeatureApi.getData(workspaceId),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useUpdateMyFeature() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: myFeatureApi.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myFeature'] });
    },
  });
}
```

### Provider Pattern (Bridge Query → Store)

```typescript
// Provider that syncs React Query data to Zustand store
export function MyFeatureProvider({ children }: { children: ReactNode }) {
  const { data } = useMyFeatureData(workspaceId);
  const setItems = useMyFeatureStore((s) => s.setItems);

  useEffect(() => {
    if (data) setItems(data);
  }, [data, setItems]);

  return <>{children}</>;
}
```

### When to Use Each

| State Type | Tool | Example |
|---|---|---|
| Server data (DB) | React Query | Dashboard metrics, platform connections |
| Server mutations | React Query mutations | Login, create item |
| UI state | Zustand | Sidebar open/closed, active tab, streaming status |
| Auth tokens | AuthContext (React context) | Access token in memory |
| Theme | ThemeContext (React context) | dark/light/system |
| Form state | react-hook-form | Form field values, validation |

---

## Testing Patterns

### Component Test

```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('renders the title', () => {
    render(<MyComponent title="Hello" />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<MyComponent loading />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
```

### Server Test

```typescript
import { describe, it, expect } from 'vitest';
import supertest from 'supertest';
import { app } from '../src/app.js';

describe('GET /api/v1/ready', () => {
  it('returns readiness status', async () => {
    const res = await supertest(app).get('/api/v1/ready');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('ready');
  });
});
```

---

## Common Pitfalls

### Import Extensions

Server uses `verbatimModuleSyntax`, requiring `.js` extensions in all relative imports:

```typescript
// ✅ Correct
import { authService } from './service.js';
import type { Request } from 'express';

// ❌ Will cause TS error
import { authService } from './service';
```

### Type-Only Imports

Always use `import type` when importing only types:

```typescript
// ✅ Correct
import type { Request, Response } from 'express';
import { Router } from 'express';

// ❌ Will emit runtime import for types only
import { Request, Response, Router } from 'express';
```

### Store Patterns

- Do NOT persist server data in Zustand stores — use React Query cache
- Do NOT store auth tokens in Zustand (they're in AuthContext)
- Always call `reset()` on logout to clear all Zustand stores
- Use selectors to prevent unnecessary re-renders: `useAuthStore((s) => s.user)`

### API Responses

The server wraps success responses with `apiResponse()` which returns `{ success: true, data }`. The Axios interceptor already unwraps `response.data`, so client code accesses `data.data`:

```typescript
// api.ts service layer
const { data } = await api.get('/api/v1/platforms/connections');
return data.data; // unwraps the apiResponse wrapper
```

### Environment Variables

- Client: Only `VITE_*` variables are available in `import.meta.env`
- Client variables are **embedded at build time** — rebuild after changes
- Server variables are validated at startup — the server fails fast if required vars are missing
- Never prefix secrets with `VITE_` — they will be exposed in the client bundle

### Route Paths (Client)

Routes are defined with exact paths. The `*` catch-all route must be the last route:

```typescript
// ✅ Correct — * is last
<Route path="/dashboard" element={...} />
<Route path="*" element={<NotFoundPage />} />

// ❌ Wrong — * should not be in the middle
```

### MongoDB Models

- Use `Schema.Types.ObjectId` for references, with `ref` for population
- Index frequently queried fields
- Use `timestamps: true` for automatic `createdAt`/`updatedAt`
- Implement `toJSON()` on user models to strip sensitive fields
- Use `select: false` on sensitive fields (e.g., passwords)

# Shared Package

## Purpose

The `shared/` directory contains code that is used by both the client and server packages. This includes type definitions, validation schemas, and shared constants.

## Structure

```
shared/
├── types/        # TypeScript interfaces and types
├── schemas/      # Zod validation schemas
├── constants/    # Shared constants
└── README.md     # This file
```

## Usage

Import shared types and schemas from the barrel exports:

```typescript
import type { User } from "shared/types";
import { loginSchema } from "shared/schemas";
```

## Guidelines

- No runtime dependencies
- No framework-specific code (React, Express, etc.)
- Types only — use `interface` or `type` declarations
- Schemas use Zod for runtime validation
- All exports must be type-safe

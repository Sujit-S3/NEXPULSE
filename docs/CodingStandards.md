# Coding Standards

## Purpose

This document defines the coding standards and conventions for the NEXPULSE AI project.

## Scope

- TypeScript conventions
- Naming conventions
- File organization
- Import ordering
- Component patterns
- Error handling

## Table of Contents

1. [TypeScript](#typescript)
2. [Naming Conventions](#naming-conventions)
3. [File Organization](#file-organization)
4. [Import Ordering](#import-ordering)
5. [Component Patterns](#component-patterns)
6. [Error Handling](#error-handling)

---

## TypeScript

- Strict mode is enabled everywhere
- No `any` unless absolutely necessary — prefer `unknown`
- Use `type` for unions/interfaces, `interface` for object shapes
- Explicit return types on exported functions
- Use `verbatimModuleSyntax` — explicit `import type` for type-only imports

## Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Files (components) | PascalCase | `GlassCard.tsx` |
| Files (utilities) | camelCase | `cn.ts` |
| Folders | camelCase or kebab-case | `components/`, `lib/` |
| Variables | camelCase | `userName` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_RETRIES` |
| Types/Interfaces | PascalCase | `UserProfile` |
| Functions | camelCase | `getUserById` |
| Hooks | camelCase, prefixed with `use` | `useTheme` |

## File Organization

- One component per file
- Co-locate related files (component + styles + tests)
- Barrel exports (`index.ts`) for folders with multiple public exports
- Utility files named by purpose (`cn.ts`, `format.ts`)

## Import Ordering

Enforced by ESLint `import/order`:

1. Built-in Node.js modules
2. External packages (react, third-party)
3. Internal aliases (`@/...`)
4. Parent/sibling/index relative imports

## Component Patterns

- Functional components only
- Props interface named `{ComponentName}Props`
- Destructure props in function signature
- Use `forwardRef` when ref forwarding is needed
- Default exports for page components; named exports for everything else

## Error Handling

- Use typed errors on the server
- Centralized error handling middleware
- Never swallow errors silently
- Log errors with context; return safe messages to clients

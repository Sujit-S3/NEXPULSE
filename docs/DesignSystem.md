# Design System

## Purpose

This document describes the NEXPULSE AI design system, including design tokens, component patterns, and visual guidelines.

## Scope

- Design tokens (colors, spacing, typography, shadows)
- Component architecture
- Theme system (dark/light/system modes)
- Animation patterns
- Glass morphism design language

## Table of Contents

1. [Design Tokens](#design-tokens)
2. [Theme System](#theme-system)
3. [Components](#components)
4. [Animations](#animations)
5. [Patterns](#patterns)

---

## Design Tokens

All tokens are plain CSS custom properties defined once in `client/src/styles/index.css`, inside an `@theme inline` block (Tailwind CSS 4's token-registration mechanism) plus theme-scoped `:root`/`[data-theme="..."]` blocks for anything that changes between light and dark. There is no separate JS token object — components consume tokens directly as `var(--token-name)` in Tailwind arbitrary-value classes (e.g. `className="p-[var(--spacing-4)] text-[var(--font-size-sm)]"`), which is the dominant styling convention across the whole client.

### Typography

- Font families: `--font-display` (Space Grotesk, for headings), `--font-sans` (Inter, body), `--font-mono` (Geist Mono)
- Scale: `--font-size-xs` (13px) through `--font-size-7xl` (88px), plus a dedicated `--font-size-hero` (56px) for landing-page hero text
- Weights: `--font-weight-normal` (400) through `--font-weight-extrabold` (800)
- Line height: `--line-height-tight` / `-snug` / `-normal` / `-relaxed`
- Letter spacing: `--letter-spacing-tight` / `-tighter` / `-normal` / `-wide`

### Spacing

A 4px-based scale from `--spacing-0` to `--spacing-24` (96px), using half-step names for fine control (e.g. `--spacing-0-5`, `--spacing-2-5`).

### Radii

`--radius-sm` (6px) through `--radius-3xl` (36px), plus `--radius-full` for pills/avatars.

### Shadows & Glass Blur

`--shadow-sm` through `--shadow-xl` are theme-aware (dark mode shadows are heavier/darker than light mode's). `--shadow-glow` / `--shadow-glow-sm` add an accent-colored glow used on hero/CTA elements. Glass blur radii (`--glass-blur-sm` 18px through `--glass-blur-xl` 48px) back the `backdrop-blur-[var(--glass-blur-*)]` utility used throughout the glass component set.

### Color

Every color is defined twice — once under `:root, [data-theme="dark"]` and once under `[data-theme="light"]` — so switching themes only requires flipping the `data-theme` attribute; no component re-renders or recomputes colors.

| Group | Tokens | Purpose |
|---|---|---|
| Background | `--color-bg`, `--color-bg-elevated`, `--color-bg-surface`, `--color-bg-hover` | Page background and layered surface levels |
| Glass | `--color-glass`, `--color-glass-border`, `--color-glass-hover`, `--color-glass-active` | The translucent panel surface used by every `Glass*` component |
| Foreground | `--color-fg`, `--color-fg-muted`, `--color-fg-subtle` | Text at decreasing emphasis |
| Accent | `--color-accent`, `--color-accent-hover`, `--color-accent-muted`, `--color-accent-strong` | Primary brand/interactive color (blue) |
| Chart colors | `--color-blue`, `--color-cyan`, `--color-emerald`, `--color-orange` (+ `-muted` variants) | Data-visualization palette, distinct from the accent color |
| Semantic | `--color-success`, `--color-warning`, `--color-error`, `--color-info` (+ `-muted` variants) | Status/feedback coloring, used consistently for alerts, banners, and form validation across every page |
| Structure | `--color-border`, `--color-border-strong`, `--color-chart-grid` | Dividers and chart gridlines |

### Z-index scale

`--z-base` (0) → `--z-elevated` (10) → `--z-sticky` (50) → `--z-overlay` (100) → `--z-modal` (200) → `--z-toast` (300) → `--z-tooltip` (400). Follow this scale rather than picking arbitrary z-index values — e.g. `OfflinePage`'s full-screen overlay uses `z-[100]` to sit above sticky nav (`--z-sticky: 50`) but below any modal.

## Theme System

The theme system supports three modes: `dark`, `light`, and `system` (auto-detect), implemented in `client/src/theme/`:

- `ThemeProvider.tsx` reads the stored mode (`localStorage["nexpulse-theme"]`, default `"system"`), resolves it against `window.matchMedia("(prefers-color-scheme: dark)")` when in `system` mode, and writes the resolved value to `<html data-theme="dark|light">` plus `document.documentElement.style.colorScheme`.
- It also subscribes to the media query's `change` event, so switching OS-level theme while `system` mode is active updates the app live without a reload.
- `theme.ts` holds the tiny config object (`storageKey`, `defaultMode`, `defaultResolved`); `useTheme.ts` is the consumer hook; `ThemeContext.ts` is the raw context.
- `ThemeToggle` (`components/common`) and `AuthThemeToggle` (`components/auth`) are the two UI entry points into `toggle()`/`setMode()`.
- CSS never branches on JS theme state — the `[data-theme="light"]` selector block in `index.css` is the only place light-mode color values exist.

## Components

### Glass primitives (`client/src/components/glass/`)

The base visual vocabulary: `GlassCard`, `GlassButton`, `GlassInput`, `GlassBadge`, `GlassAvatar`, `GlassSearch`. These wrap the `--color-glass*` tokens and `backdrop-blur-[var(--glass-blur-*)]` into consistent, reusable surfaces — nearly every page-level panel in the app is a `GlassCard` (or the `AtroposCard` variant, below).

### Other component groups (`client/src/components/`)

| Directory | Contains |
|---|---|
| `layout/` | `AppShell`, `MainLayout`, `Navbar`, `Sidebar`, `NotificationDropdown`, `ProfileDropdown`, `CommandPalette` — the authenticated-app chrome |
| `common/` | `ErrorBoundary`/`ErrorFallback`/`EmptyState`/`LoadingOverlay`, `Skeleton` family (`KPISkeleton`, `ChartSkeleton`, `TableSkeleton`), `BrandLogo`, `ThemeToggle`, `ProtectedRoute` |
| `auth/` | `AuthBackground`/`AuthParticles`, `AuthFloatingLogo`, `AuthPanel`, `PremiumInput`, `PremiumButton`, `AuthThemeToggle`, `AuthFooterLinks` — the unauthenticated auth-page shell, visually distinct from the authenticated app's glass surfaces |
| `landing/` | Marketing page sections (`HeroSection`, `FeaturesSection`, `PricingSection`, `FAQSection`, `CTASection`, `LandingNav`, `FooterSection`, `DashboardShowcase`, `AISection`) |
| `get-started/` | The 5-step onboarding wizard (`StepWelcome`, `StepObjective`, `StepPlatforms`, `StepDetails`, `StepConfirm`) |
| `identity/` | `IdentitySecuritySettings` (MFA, sessions, API credentials, service accounts) |
| `platforms/` | `ConnectedAccountsSettings`, `OAuthAccountPicker` |
| `enterprise/` | Enterprise-tier feature UI |
| `effects/` | `ScrollReveal` and other scroll/intersection-driven visual effects |
| `ui/` | `AtroposCard` (a tilt/parallax card wrapper) and other one-off UI primitives |

There is no separate `charts/`, `dashboard/`, or `forms/` component directory — chart rendering, dashboard widgets, and form fields are built inline within their owning page/feature rather than factored into a shared library. (Earlier, empty scaffolding for those directories existed and has since been removed — see `CHANGELOG.md`.)

### Naming convention

Components prefixed `Glass*` are the base primitives; `Premium*` (`PremiumInput`, `PremiumButton`, `PremiumSelect`) are the auth/marketing-page equivalents with heavier visual treatment; `Atropos*` wraps the `atropos-react` tilt-effect library.

## Animations

Two parallel animation-preset modules exist — know which one a file is using before adding to it:

- **`client/src/lib/motion.ts`** — the general-purpose preset library: `easing`, `spring` (`gentle`/`wobbly`/`stiff`/`slow`), `duration`, and `Variants` objects for page transitions, fades, staggered lists, hover states, modals, and drawers (`left`/`right`/`top`/`bottom`). Import from here for any new animated component.
- **`client/src/motion/`** — `MotionProvider.tsx` plus `RouteTransition` (used by `MainLayout`/`AILayout` to animate between routed pages, keyed on `location.pathname` so the transition — and any `ErrorBoundary` nested inside it — resets on navigation).
- **CSS keyframes** in `index.css`'s `@theme` block (`fade-in`, `fade-up`, `fade-down`, `scale-in`, `slide-in-right`, `pulse-glow`, `float`, `spin-slow`, `morph-in`/`morph-out`, `reflection-sweep`, `dock-breathing`) back the `--animate-*` tokens for animations applied via plain Tailwind classes rather than Framer Motion — used for ambient/looping effects (glow, float) rather than one-shot transitions.

All Framer Motion durations/easings route through the `--duration-*` / `--ease-*` CSS tokens conceptually (matching values, e.g. `--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1)` mirrors `easing.decelerate`-style curves) even though Framer Motion itself takes JS values from `lib/motion.ts`, not the CSS variables directly — keep the two in sync by eye when tuning motion.

## Patterns

- **Loading state**: every data-driven page/section uses the `Skeleton` family from `components/common`, not spinners, matching the shape of the eventual content (see `KPISkeleton`, `ChartSkeleton`, `TableSkeleton`).
- **Error state**: query-level errors render an inline alert banner (`role="alert"`, `--color-error` tinted); render-time exceptions are caught by `ErrorBoundary`, wrapped around `<Outlet />` at the `MainLayout`/`AILayout` level so any authenticated page gets a friendly fallback instead of a blank screen.
- **Empty state**: the shared `EmptyState` component (icon + title + description + optional action button) is used consistently rather than ad hoc "no data" text — pages should not hand-roll their own empty-state markup.
- **Overlay pattern**: full-screen states that must appear above whatever page is currently mounted (rather than replacing it) use `fixed inset-0 z-[100]` with a `backdrop-blur-sm` background over a centered `GlassCard` — see `OfflinePage` for the reference implementation.
- **Local input/button styling**: pages with their own small forms outside the main `Glass*`/`Premium*` families (e.g. `Profile.tsx`, `Team.tsx`, `IdentitySecuritySettings.tsx`) define local `inputClass`/`primaryButton`/`secondaryButton` string constants at the top of the file rather than importing a shared form-input component — this is the established convention for settings-style forms, not an inconsistency to "fix."
- **CSS variables over Tailwind's default scale**: nearly every class list uses `var(--token)` inside Tailwind's arbitrary-value syntax (`p-[var(--spacing-4)]`) instead of Tailwind's built-in spacing/color scale — this is intentional, so the entire visual language stays theme-aware and centrally tunable from `index.css`.

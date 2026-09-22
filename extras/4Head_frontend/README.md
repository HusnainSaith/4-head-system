# 4Head Frontend

React 18 frontend for the Poultry Business Management System. The existing
NestJS backend remains in the sibling `4Head_backend/` directory.

## Requirements

- Node.js 20.19+ (Node 22.12+ is also supported by Vite)
- npm

## Setup and commands

```bash
npm install
cp .env.example .env
npm run dev
```

The development server defaults to `http://localhost:5173`.

```bash
npm run lint       # ESLint
npm run format     # Prettier
npm run build      # strict TypeScript check and Vite production build
npm run test       # Vitest and React Testing Library
npm run test:watch # Vitest watch mode
npm run preview    # preview the production bundle
```

Husky invokes lint-staged before commits. Staged TypeScript files are fixed by
ESLint and formatted by Prettier; other supported text files are formatted by
Prettier. `eslint-config-prettier` is applied last so ESLint formatting rules do
not conflict with Prettier.

## Environment

`VITE_API_BASE_URL` is the complete backend origin with no trailing API prefix.
The checked backend has no global prefix and its local `.env` uses port 3000:

```env
VITE_API_BASE_URL=http://localhost:3000
```

Copy `.env.example` to `.env` for development. For deployment, create an
uncommitted `.env.production` containing the deployed API origin. Only
`VITE_`-prefixed values are exposed to browser code; never put database
credentials, JWT secrets, or API secrets in frontend environment files.

`VITE_ENABLE_DEV_PAGES=true` enables the internal `/dev/style-guide` route only
while Vite is running in development mode. The route cannot be enabled in a
production build.

## Architecture

The source tree is feature-based:

```text
src/
  app/            root app and providers
  components/     shared UI, composites, and layout
  features/       domain features such as auth and dashboard
  hooks/          cross-cutting hooks
  lib/            utilities and constants
  routes/         route definitions and guards
  store/          Redux store and the single RTK Query base API
  styles/         design tokens
  types/          shared backend-derived types
```

Imports use the `@/` alias, including `@/components`, `@/features`, `@/lib`,
`@/hooks`, `@/store`, `@/types`, `@/routes`, and `@/assets`.

## Design System

Visual values are defined once in `src/styles/tokens.css`, exposed through
Tailwind in `tailwind.config.ts`, and consumed with semantic utilities. Raw
one-off colors, spacing, typography, and inline styles do not belong in feature
components.

Shared shadcn/Radix primitives live in `src/components/ui/`:

- Alert, AlertDialog, Avatar, Badge, Button, Card
- Checkbox, Dialog, DropdownMenu, Input, Label
- RadioGroup, Select, Separator, Skeleton, Sonner/Toast, Switch
- Table, Tabs, Textarea, Tooltip
- React Hook Form primitives

Shared composites live in `src/components/common/`:

- `FormField` - consistent label, control, description, and validation error
- `PageHeader` - standard screen heading and action area
- `DataTable` - typed sorting and pagination surface
- `StatCard` - reusable dashboard metric with trend and icon support
- `EmptyState`, `ErrorState`, and `PageSkeleton` - mandatory data states
- `ConfirmDialog` - standard destructive confirmation flow

The authenticated `AppShell`, role-aware `Sidebar`, account `Topbar`, and
`PageContainer` live in `src/components/layout/`.

Never create a new button/input/card styling inline in a feature file. Add a
reusable variant to `components/ui` or a composition to `components/common`
first, then consume it from the feature. Do not build ad hoc controls or styled
copies inside feature folders.

The development-only `/dev/style-guide` page renders the palette, all primitive
variants, shared composites, forms, tables, overlays, toast, and loading/empty/
error states for visual QA.

## Token storage decision

Access and refresh tokens are stored in frontend-managed cookies via
`js-cookie`, not localStorage. Because JavaScript can read these cookies, this
has the same XSS-exposure profile as localStorage; it is a storage-location
choice, not an added security boundary. Tokens will be read in JavaScript and
attached manually as `Authorization: Bearer` headers, rather than relying on
automatic browser cookie submission. Production cookies use `Secure` and
`SameSite=Strict`, with expiry decoded independently from each JWT's `exp`.
Migrating to real httpOnly cookies later requires backend `Set-Cookie` support.

The backend does not expose a `/me` route usable by every role and its JWT does
not contain the full user profile. The frontend therefore caches the non-secret
login profile in a separate JS-readable cookie for reload bootstrap. This cache
controls presentation only; backend guards remain the authorization authority.

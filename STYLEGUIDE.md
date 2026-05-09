# Videaa style guide

Code and structure conventions for the Videaa frontend. For scalability and version-bump safety we align with practices like [OpenShift Console](https://github.com/openshift/console) (e.g. moving away from barrel exports, clear boundaries).

## Tech stack (Vite, frontend)

- **Build:** Vite. Config in `vite.config.ts`; env vars must be prefixed with `VITE_` to be exposed to the client. Use `import.meta.env.VITE_*` only; never expose secrets.
- **Aliases:** All `@/` aliases are defined in `vite.config.ts` (e.g. `@/api`, `@/components`, `@/features`, `@/common`, `@/lib`). Use these instead of long relative paths. Do not add new aliases without updating the config and this doc.
- **Build output:** Production build goes to `dist/`. Do not rely on `dist` structure in repo scripts; use Vite’s public dir and asset handling.

## Backend (external repo)

- **Env:** Frontend only uses `VITE_*` vars; `VITE_BACKEND_URL` points at the backend from that repo. API keys and server env live in the backend repo.
- **API surface:** Frontend calls the backend via services in `src/api/` (e.g. `video-generation-service`, `slideshow-service`, `voice-service`). Do not add a `backend/` or `server/` directory here.

## Directory and file names

- **Lowercase, dash-separated** for files and directories (avoids case-sensitivity issues across OS).
- **Exceptions:** `README.md`, config files with fixed names (e.g. `vite.config.ts`, `tsconfig.json`).
- **Component files:** Lowercase dash-separated to match the rest of the repo (e.g. `voiceover-selector.tsx`, `generation-panel.tsx`). Component names in code remain PascalCase.

## TypeScript and React

- **Language:** New code must be TypeScript (`.ts` / `.tsx`). No new JavaScript.
- **Components:** Functional components with hooks only (no class components).
- **Linting:** Follow ESLint rules; run `npm run lint` (and `lint:fix` where applicable). No `any` without a justified escape; prefer proper types or `unknown` with guards.

### Type safety

- **Avoid `any`:** Prefer explicit types or `unknown` with type guards. AI agents should flag `any` and suggest proper types.
- **Null/undefined:** Model optionality explicitly: `string | undefined`, `value?: number`.
- **Component props:** Prefer `interface` or `type` for props; reuse types from existing components when possible.

```ts
// Prefer
interface VoiceoverSelectorProps {
  value: VoiceoverOptions;
  onChange: (value: VoiceoverOptions) => void;
  projectAudioList?: ProjectAudioItem[];
}

// Avoid
const props: any = { ... };
```

- **Import types:** Use `import type` for type-only imports.

```ts
import type { VoiceoverOptions, VoiceoverMode } from "@/api/video-generation-service";
import { DEFAULT_AI_VOICES } from "@/api/video-generation-service";
```

### Hooks and state

- Use React hooks (useState, useEffect, useCallback, useMemo) for state and side effects.
- **Memoization:** Use `useCallback` for handlers passed to children and `useMemo` for derived data when it avoids unnecessary re-renders or heavy work.

```ts
// Handlers passed down
const handleExport = useCallback((format: "pptx" | "pdf") => { ... }, []);

// Expensive or stable derived data
const slideshowTitle = useMemo(
  () => extractedContent?.documents[0]?.title || topic.slice(0, 50) || "Slideshow",
  [extractedContent, topic]
);
```

## Styling (Tailwind + shadcn)

- **Primary styling:** Tailwind CSS utility classes. No custom CSS/SCSS unless necessary (e.g. third-party overrides).
- **Components:** Use shadcn/ui (Radix-based) from `src/common/components/ui/`. Extend or compose them rather than replacing with one-off primitives.
- **Naming:** Prefer semantic class names and Tailwind’s design tokens (e.g. `text-muted-foreground`, `bg-primary`) for consistency and theme support.
- **No inline styles** for layout/typography; use Tailwind. Inline styles only for dynamic values (e.g. width from props).

## API and services

- **Backend URL:** `VITE_BACKEND_URL` (e.g. `http://localhost:4000`). Never hardcode backend base URL; use env.
- **Pattern:** Services in `src/api/` call the backend (or Supabase). Components import from specific API modules (see [Imports](#barrel-exports-and-direct-imports)) and use async functions that return typed results (`{ success, data?, error? }` or similar).
- **Sensitive keys:** API keys (OpenAI, fal.ai, etc.) must stay on the backend. Frontend only sends user/scoped data and receives URLs or opaque IDs when needed.

## Barrel exports and direct imports

We **prefer direct imports** and are moving away from barrel exports (same as [OpenShift Console](https://github.com/openshift/console/blob/main/STYLEGUIDE.md#importing-from-barrel-files-and-circular-dependencies)) to avoid circular dependencies, slower builds, and unclear boundaries. See [ARCHITECTURE.md](ARCHITECTURE.md#barrel-exports-and-direct-imports-scalability) for full policy.

- **New code:** Import from the file that defines the symbol. Do **not** add new re-exports to `src/common/components/ui/index.ts`.
- **UI components:** Prefer `@/components/ui/<component>` (or `@/common/components/ui/<component>`) for the specific component file.

```ts
// Prefer – direct import from defining file
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { voiceService } from "@/api/voice-service";
import type { Screenplay } from "@/api/video-generation-service";

// Avoid for new code – barrel pulls in many modules and can cause circular deps / slower builds
import { Button, Label, Select } from "@/components/ui";
import { videoGenerationService, generateVideo } from "@/api";
```

- **API services:** Prefer `@/api/<service-file>` (e.g. `@/api/video-generation-service`, `@/api/slideshow-service`). Use `import type` for types.
- **Contexts:** Prefer `@/common/contexts/AuthContext` (or ProjectContext, ThemeContext) when a file only needs one context.
- **Features:** Never import from a feature barrel. App and routers use full paths: `from "@/features/dashboard/DashboardPage"`.
- **Order:** Group imports: external (react, third-party), then internal (`@/...`), then relative. Use `import type` for type-only imports.

## Testing

- **Unit:** Vitest + Testing Library. Tests next to code (`*.spec.ts`, `*.spec.tsx`) or in `__tests__/` under the feature/common module.
- **E2E:** Cypress in `cypress/e2e/` and `cypress/views/`. Use stable selectors (data attributes or roles); avoid brittle CSS class names.
- **Convention:** One describe per module or component; test tables or small cases for multiple inputs where it improves clarity.

## File layout (conventions)

- **Components:** One main component per file; small subcomponents can live in the same file if not reused.
- **Feature code:** Under `src/features/<feature>/` (e.g. dashboard, landing, projects). Co-locate tests and types when it keeps the feature self-contained.
- **Shared UI:** `src/common/components/ui/`. Shared hooks/utils in `src/common/hooks/`, `src/common/utils/`.

## Accessibility and i18n

- **a11y:** Use semantic HTML, ARIA where needed, keyboard support for custom controls. Prefer Radix/shadcn primitives which handle many a11y concerns.
- **Text:** User-visible strings in JSX (no hardcoded multi-language yet). When i18n is added, use a single pattern (e.g. keys in a namespace) and document it here.

## Deprecations and cleanup

- Avoid importing from paths that include `/deprecated` or files prefixed with `DEPRECATED_`.
- Remove dead code when refactoring; don’t leave commented-out blocks for long.

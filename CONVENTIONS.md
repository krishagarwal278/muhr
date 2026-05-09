# Conventions (Videaa)

Development workflow and consistency rules. Aligned with [OpenShift Console CONTRIBUTING](https://github.com/openshift/console/blob/main/CONTRIBUTING.md) style where applicable.

## Contribution flow

1. Create a topic branch from `main` (e.g. `feature/name` or `fix/name`).
2. Make **logical, focused commits** (one concern per commit).
3. Follow the [commit message format](#commit-messages) below.
4. Run tests and lint before pushing: `npm run lint`, `npm run typecheck`, `npm run test:run` (and `npm run test:e2e` when touching flows covered by Cypress).
5. Push to your branch and open a pull request.

## Commit messages

- **Subject line:** Short summary of *what* changed (imperative: “Add …”, “Fix …”, “Update …”). ~50 chars or less when practical.
- **Body (optional):** Explain *why* or give context. Wrap at ~72 characters.

Example:

```
Add Content AI dropdown for slideshow generation

Sends contentAiModel ("kimi" | "openai") in generate-slideshow and
generate-slideshow-preview request bodies. Backend can use it to
select Kimi vs GPT-4o for slide content.
```

- **Fixes:** If the commit closes an issue, add “Fixes #123” (or “Closes #123”) in the body so the issue is linked and closed on merge.

## Branch naming

- **Default branch:** `main`
- **Features:** `feature/<short-name>` or `feat/<short-name>` (e.g. `feature/voiceover-selector`)
- **Bugfixes:** `fix/<short-name>` or `bugfix/<short-name>` (e.g. `fix/export-slideshow-download`)
- **Docs/chore:** `docs/...` or `chore/...` as needed

## Code format and quality

- **Formatting:** Prettier. Run `npm run format` before committing; CI may run `npm run format:check`.
- **Linting:** ESLint. Run `npm run lint`; use `npm run lint:fix` for auto-fixable rules. Resolve remaining issues manually.
- **Types:** No `tsc` errors. Run `npm run typecheck` (or rely on `npm run build` which runs `tsc --noEmit`).

## Required checks before PR

- [ ] `npm run lint` passes (or `lint:ci` in CI with configured max-warnings).
- [ ] `npm run typecheck` (or `npm run build`) passes.
- [ ] `npm run test:run` passes.
- [ ] E2E: `npm run test:e2e` passes when you changed flows covered by Cypress.
- [ ] No secrets or `.env` values committed; use `.env.example` for variable names only.

## Dependencies and version bumps

- **Package manager:** npm only. Use `npm ci` in CI and for reproducible installs; do not commit without an updated lockfile after dependency changes.
- **Adding/updating deps:** See **[DEPENDENCIES.md](DEPENDENCIES.md)** for version policy (exact vs ranges), adding new packages, and the **upgrade checklist** for critical dependencies (React, Vite, TypeScript, Tailwind, Radix, Supabase, Vitest, Cypress).
- **Critical upgrades:** One major (or high-impact) dependency per PR; run full lint, typecheck, test:run, test:e2e, build, and manual smoke before merging.

## Docs and agents

- **AGENTS.md** — Entry point for AI coding agents; read first.
- **ARCHITECTURE.md** — Layers, barrel vs direct imports, scalability, external backend repo.
- **STYLEGUIDE.md** — TypeScript, React, Vite, Tailwind, file layout, testing, imports.
- **DEPENDENCIES.md** — Package management, version bumps, critical deps (frontend only; backend is external).
- **CONVENTIONS.md** — This file (commits, branches, checks, deps).

When adding new workflows or tooling (e.g. new scripts, CI steps), update the relevant doc and/or README so humans and agents stay in sync.

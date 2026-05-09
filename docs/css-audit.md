# CSS audit — Muhr (vawlt) — Phase 1

**Date:** 2026-05-01  
**Scope:** Read-only inventory and migration plan. **No code was refactored** as part of this document.

**Phase 2 (approved direction):** Keep Tailwind v4; **`styles/`** at repo root with **`@theme`** tokens; **`class-variance-authority`** for repeated recipes; **`styles/vendor/`** for Driver.js; no CSS Modules / BEM. See **`docs/css-conventions.md`**.

---

## Executive summary

This codebase is **Tailwind CSS v4–first**: almost all UI is expressed as utility `className` strings on **34 `.tsx` files**. There is **one** application stylesheet, `app/globals.css` (~149 lines), which imports Tailwind, Driver.js defaults, a tiny `:root` / `@theme` block, `body` rules, and **third-party overrides** for Driver.js (heavy `!important`).

**There are zero `*.module.css` files** and no `styled-components` / Emotion.

**Critical alignment note:** Your agent brief targets **“Plain CSS + CSS Modules”** and a `src/styles/` tree. This repo uses **`app/` (no `src/`)** and **Tailwind as the primary styling system**. A full migration off Tailwind to modules-only would touch **every page and component** and is **not** a “slice-safe, pixel-identical” refactor without an explicit decision to **remove or coexist** with Tailwind. **Recommendation:** either (A) adopt the layered **tokens + base** CSS **alongside** Tailwind (extract vendor + shared tokens first), or (B) plan a **multi-phase Tailwind removal** with explicit sign-off. Phase 1 does not assume (B).

---

## 1. Inventory

### 1.1 Stylesheets

| Path | Lines (approx.) | Role |
|------|------------------|------|
| `app/globals.css` | **149** | Tailwind entry, `@theme`, `:root`, `body`, Driver.js vendor overrides |
| `node_modules/driver.js/dist/driver.css` | (vendor) | Imported from `globals.css`; overridden locally |

**Total first-party CSS files:** **1** (`app/globals.css`).

**`*.scss` / `*.sass`:** none found.  
**`*.module.css`:** none found.  
**`*.styles.ts` / `css.ts`:** none found.

### 1.2 Global CSS entry

- `app/layout.tsx` imports `./globals.css` **once** (correct single entry).

### 1.3 Inline `style={{ ... }}`

| File | Usage |
|------|--------|
| `app/(app)/vault/upload/page.tsx` | Dynamic bar width: `width: \`${uploadProgress}%\`` |
| `app/(marketing)/page.tsx` | Stagger: `transitionDelay: \`${i * 100 + 200}ms\`` |

No other `style={{` hits in `.tsx` / `.jsx` (grep).

### 1.4 `className` usage (Tailwind)

Rough frequency: **`className=` appears across all 34 `.tsx` files** (components + app routes). Marketing home (`app/(marketing)/page.tsx`) and several app pages are the densest.

---

## 2. Approach mix

| Approach | In use? | Examples / notes |
|----------|---------|------------------|
| **Tailwind utility classes** | **Yes — dominant** | e.g. `app/(app)/layout.tsx`, `app/(app)/dashboard/page.tsx`, `components/license/IncomingLicenseRequests.tsx` |
| **Tailwind v4 `@import "tailwindcss"` + `@theme inline`** | Yes | `app/globals.css` |
| **Plain global CSS (custom)** | Yes (small) | `:root`, `body` in `app/globals.css` |
| **CSS Modules** | No | — |
| **styled-components / Emotion** | No | — |
| **Third-party CSS** | Yes | `driver.js/dist/driver.css` via import in `globals.css` |
| **Inline styles** | Minimal | 2 files (see above) |

---

## 3. Global surface area (non-module CSS)

Everything in `app/globals.css` that is **not** the Tailwind import itself:

| Selector / block | Purpose | Global side effect? |
|------------------|---------|---------------------|
| `:root { --background; --foreground }` | App tokens | Yes — document root |
| `@theme inline { ... }` | Tailwind v4 theme bridge | Yes — affects generated utilities |
| `body { background, color, font-family, smoothing }` | Base document | Yes |
| `.driver-popover.muhr-driver-popover` and descendants | Driver.js popover theming | **Yes — third-party DOM** |
| `.driver-active .driver-overlay` | Driver.js overlay fill | **Yes** |

**There are no other global class names** defined by this project except the Driver.js-related rules above. Tailwind generates its own utilities globally (expected).

**No `:global` usage** in the repo (grep).

---

## 4. Token candidates (from `globals.css` + Tailwind usage)

### 4.1 Hardcoded colors in `app/globals.css` (explicit hex / rgb)

| Value | Occurrences (approx.) | Suggested semantic token (for later) |
|-------|------------------------|--------------------------------------|
| `#0a0a0a` | `:root` background, overlay fill, next button text | `--color-bg-canvas` / `--color-text-inverse` (context-dependent — **do not merge without review**) |
| `#ffffff` | `:root` foreground | `--color-text-primary` |
| `#fafafa` | Popover text, buttons | `--color-text-bright` |
| `#141414` | Popover surface, arrow | `--color-bg-elevated` |
| `#ffffff` (hover next) | Popover | `--color-bg-surface-hover` |
| `rgba(255,255,255,0.04–0.65)` | Borders, muted text | `--color-border-subtle`, `--color-text-muted-*` |

**Flag:** `#0a0a0a` is used for both **page background** and **primary button text** in the Driver theme — same value, different roles; keep **separate semantic tokens** even if the hex matches.

### 4.2 Tailwind palette (frequency — indicative, not exhaustive)

Grep counts for utility **prefix patterns** in `*.tsx`:

| Pattern | Files touching (count from grep) | Notes |
|---------|----------------------------------|--------|
| `neutral-`, `white/`, `emerald-`, `amber-`, `red-`, `zinc-`, `indigo-` | **31** files | Primary dark UI language |
| Responsive prefixes `sm:`, `md:`, `lg:`, `xl:`, `2xl:` | **12** files (occurrence-heavy in marketing) | Breakpoints are **Tailwind defaults** unless customized in config |

**Near-duplicate risk:** Tailwind `neutral-950`, `bg-black`, `#[custom]` in Driver block, and `white/[0.02]` stacks are **visually similar**; the audit **does not merge** them without visual diff.

### 4.3 Spacing / radii / typography

- **Spacing:** Mostly Tailwind spacing scale (`p-4`, `gap-3`, `space-y-8`, etc.) — hundreds of call sites; token migration would map to `--space-*` **only if** leaving Tailwind or generating theme from CSS variables.
- **Radii:** `rounded-lg`, `rounded-xl`, `rounded-full`, `rounded-2xl` — high frequency.
- **Font sizes:** `text-xs` through `text-2xl` + arbitrary sizes where used.
- **Font families:** Geist Sans / Mono via `next/font` variables `--font-geist-sans`, `--font-geist-mono` in `app/layout.tsx` and `@theme` in `globals.css`.
- **Shadows:** `shadow-xl`, custom box-shadow only in Driver overrides in `globals.css`.
- **z-index:** Utilities `z-10`, `z-20`, `z-50`, arbitrary `z-[19]` in `app/(app)/layout.tsx` — **document a single z-index scale** if consolidating.

### 4.4 Breakpoints

- **Tailwind default breakpoints** (via `@tailwindcss/postcss`); no custom `breakpoints.css` in repo.
- **Media queries in hand-written CSS:** none beyond `min(360px, calc(100vw - 2rem))` in Driver popover `max-width`.

---

## 5. Duplication hotspots (conceptual)

Not separate CSS files, but **repeated Tailwind “recipes”** across TSX:

- **Card shell:** `rounded-xl border border-white/10 bg-white/[0.02]` (and variants) — appears across dashboard, licenses, settings, vault, etc.
- **Primary button (light on dark):** `rounded-lg bg-white ... text-black`
- **Ghost / secondary:** `border border-white/15 ... hover:bg-white/10`
- **Page title block:** `text-2xl font-semibold tracking-tight` + `text-sm text-white/60`

These are good **candidates for CSS Modules + BEM** *or* for **Tailwind `@apply` in a component layer** — **user must choose**; the brief prefers Modules.

---

## 6. Dead CSS suspects

- **Project-defined classes:** Only Driver.js-related selectors in `globals.css`. All are referenced indirectly: `muhr-driver-popover` is set in `lib/tour/navTour.ts` (`popoverClass`).
- **Tailwind classes “dead”:** Not audited exhaustively (would require parsing every string against usage); given volume, recommend **automated** tooling (e.g. Tailwind content scan already limits generated CSS).

---

## 7. Risk list (migration)

| Risk | Detail |
|------|--------|
| **Tailwind removal / coexistence** | Largest risk; affects every file. |
| **`!important` in Driver theme** | Required to beat vendor CSS; any refactor must preserve cascade order. |
| **Deep third-party selectors** | `.driver-popover-title`, `.driver-popover-next-btn`, etc. — fragile if Driver.js upgrades class names. |
| **`@theme inline` + PostCSS** | Moving tokens must stay compatible with Tailwind v4 pipeline. |
| **Pixel parity** | Converting long `className` strings to modules requires **per-screen** visual diff. |
| **No `npm run lint`** | `package.json` has **no `lint` script**; Phase 6 “lint passes” needs adding ESLint/Stylelint or adjusting verification. |
| **Folder `src/` vs `app/`** | Brief’s `src/styles/` does not match current layout; **confirm** `app/styles/` vs introducing `src/`. |

---

## 8. Migration plan (awaiting approval before Phase 2)

### 8.1 Alignment decision (confirm in chat)

1. **Keep Tailwind** and add a **thin token + vendor CSS layer** (recommended for “no visual change” and speed), **or**
2. **Migrate incrementally to CSS Modules** and **reduce** Tailwind over time, **or**
3. **Remove Tailwind** entirely (large; explicit approval + timeline).

Until (1–3) is chosen, Phases 3–4 of the original brief cannot be executed faithfully.

### 8.2 Proposed folder structure (Next.js–adjusted)

If keeping a single global entry (current pattern):

```text
app/
  globals.css              /* only @import chain */
styles/                    /* or app/styles/ — confirm */
  index.css                /* re-exports: tokens → base → utilities → vendor */
  tokens/
    colors.css
    spacing.css
    typography.css
    radii.css
    shadows.css
    z-index.css
    breakpoints.md         /* document Tailwind breakpoints if no PostCSS @custom-media */
  base/
    reset.css              /* optional: only if you add explicit reset */
    elements.css           /* h1, a, body — split from today’s body rules */
  utilities/
    layout.css             /* .u-* only if truly shared */
    a11y.css
  vendor/
    driverjs.css           /* current .driver-popover.muhr-driver-popover block */
```

`app/globals.css` would become:

```css
@import "tailwindcss";
@import "../styles/index.css";  /* path TBD */
```

—or `styles/index.css` imports tokens then you keep `globals.css` minimal.

**Note:** The brief’s `src/components/Button/` layout does not exist; today it’s `components/`. Moving to `src/` is optional and **should be confirmed**.

### 8.3 Proposed design token names (semantic)

Examples only — **do not merge** near-duplicates without diff:

- `--color-bg-canvas` → page background (`#0a0a0a` today)
- `--color-bg-elevated` → popover / cards on canvas (`#141414` in Driver)
- `--color-text-primary` → primary text on dark (`#fafafa` / `#ffffff` — **two values today; flag**)
- `--color-text-muted` → description text opacities
- `--color-border-subtle` → `rgba(255,255,255,0.1)` tier
- `--font-sans` / `--font-mono` → already wired via Geist variables
- `--radius-md`, `--radius-lg` → map from `0.5rem` / `0.75rem` in Driver
- `--z-header`, `--z-sidebar`, `--z-overlay`, `--z-tooltip` → replace magic `z-10` / `z-[19]` / `z-50` over time

### 8.4 BEM examples (real components)

**Example A — `components/KycStatusBadge.tsx`**

- Block: `kyc-badge`
- Modifiers: `kyc-badge--verified`, `kyc-badge--pending`, `kyc-badge--failed`, `kyc-badge--default`
- Element: `kyc-badge__icon`

**Example B — `components/ui/CookieBanner.tsx`**

- Block: `cookie-banner`
- Elements: `cookie-banner__text`, `cookie-banner__actions`, `cookie-banner__link`
- Modifier: `cookie-banner--visible` (if stateful)

**Example C — `app/(app)/layout.tsx` sidebar link**

- Block: `app-sidebar` (layout-level)
- Elements: `app-sidebar__link`, `app-sidebar__icon`, `app-sidebar__profile`
- Modifier: `app-sidebar__link--active`

### 8.5 Slices (ordered — smallest / safest first)

1. **Documentation only:** Approve this audit + choose Tailwind strategy (§8.1). Add `npm run lint` if Phase 6 requires it.
2. **Vendor extraction (no visual change):** Move Driver.js overrides from `app/globals.css` → `styles/vendor/driverjs.css`; re-import; verify tour pixel-identical.
3. **Token files (parallel to Tailwind):** Split `:root` / `body` into `styles/tokens/*` + `styles/base/elements.css`; map existing `@theme` values to `var(--*)` **without** changing output RGB.
4. **First CSS Module:** Smallest presentational component (e.g. `KycStatusBadge` or `CookieBanner`) — one file, visual diff.
5. **Repeat modules** for `components/ui/*`, then `components/vault/*`, then heavy pages.
6. **Feature grouping (`src/features/...` or `app/features/...`):** Only after modules exist and **import graph** is clear; grep-driven moves.
7. **`docs/css-conventions.md`:** After 2–3 slices prove the pattern.
8. **Stylelint:** Only if you explicitly approve new devDependency (brief rule).

---

## 9. Phase 1 stop

**Do not start Phase 2 (foundation file creation) until:**

- Tailwind **keep vs migrate vs remove** is decided, and  
- Final root for styles (`styles/` vs `app/styles/` vs `src/styles/`) is confirmed, and  
- You accept that **strict pixel parity** requires visual checks per slice.

---

## References

- Driver.js installation / usage: [driverjs.com/docs/installation](https://driverjs.com/docs/installation)  
- Tailwind v4 + PostCSS: current `postcss.config.mjs` uses `@tailwindcss/postcss`.

# CSS conventions — Muhr

This app is **Tailwind CSS v4–first**. Global structure: `app/globals.css` imports Tailwind, then `styles/index.css` (theme + base), then Driver.js vendor CSS. **Do not** introduce CSS Modules or BEM for component styling; use utilities and shared **CVA** recipes where patterns repeat.

---

## Theme tokens (`@theme`)

- Token files live under `styles/theme/` and are imported from `styles/index.css`.
- Add or change tokens in **`@theme inline { ... }`** so Tailwind generates matching utilities (`bg-canvas`, `text-foreground`, `z-overlay`, etc.) and CSS variables exist for plain CSS (e.g. vendor overrides).
- **Semantic text on dark:** keep **`--color-foreground`** (`#ffffff`) and **`--color-text-bright`** (`#fafafa`) as **separate** roles — body vs emphasized copy. Do not merge them for convenience even if hex values are close.

### Adding a color token

1. Edit `styles/theme/colors.css` (or a dedicated theme partial) inside `@theme inline`.
2. Prefer names that map cleanly to utilities: `--color-*` → `bg-*`, `text-*`, `border-*`.
3. Use the new utility in JSX, or `var(--color-*)` in vendor/global CSS under `styles/vendor/` or `styles/base/`.

### Z-index scale

Defined in `styles/theme/z-index.css` with the `--z-*` namespace (Tailwind v4):

| Token / utility   | Role                                      |
|-------------------|-------------------------------------------|
| `z-header`        | Sticky marketing header, mobile app header |
| `z-nav-strip`     | Mobile section strip below header         |
| `z-sidebar`       | Desktop sidebar                           |
| `z-overlay`       | Modals, cookie bar, tooltips              |

Use these instead of magic values like `z-[19]` or scattered `z-50`.

---

## CVA recipes vs inline utilities

- **`class-variance-authority` (CVA)** lives under `components/ui/` for **repeated “recipes”** (same class string copy-pasted across files): e.g. panel surfaces, primary/ghost buttons, page header chrome.
- **Inline Tailwind** is correct for one-off layout and feature-specific composition.
- **Do not** use `@apply` to fake components — it hides the utility signal and adds a second naming layer.

Shared recipes (extend as needed):

| Module                    | Purpose                                      |
|---------------------------|----------------------------------------------|
| `components/ui/surface-card.ts` | Bordered translucent panels (`surfaceCardVariants`) |
| `components/ui/button-recipes.ts` | `primaryButtonVariants`, `solidButtonVariants`, `outlineButtonVariants`, `dangerButtonVariants`, `ghostButtonVariants`, `subtleButtonVariants` |
| `components/ui/page-header.ts`  | `appPageHeaderVariants`, `appPageTitleVariants` |

Merge CVA output with local classes using `cx()` from `lib/cx.ts`.

---

## Vendor CSS

- Third-party overrides (e.g. Driver.js) go in **`styles/vendor/`**, imported from `app/globals.css` **after** the library’s own stylesheet when order matters.
- Prefer theme variables (`var(--color-*)`) inside vendor files so popovers track token changes.
- Keep `!important` only where required to beat library rules; document why in a one-line comment if non-obvious.

---

## Breakpoints

Use Tailwind defaults (`sm`, `md`, `lg`, …). If the design needs a **named** breakpoint, extend `@theme` per Tailwind v4 docs and document it here — avoid one-off media queries in random components unless necessary.

---

## Feature colocation

Components imported from **exactly one** app feature may live in **`app/(app)/<feature>/_components/`** (the `_` prefix excludes the folder from routing). Shared atoms stay in **`components/`**.

---

## Lint

- `npm run lint` runs **`eslint .`** (Next.js 16 no longer ships a `next lint` command). Stylelint is not configured; Tailwind’s content scan handles dead utilities.

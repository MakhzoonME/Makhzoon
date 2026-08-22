# Theming & Localization

App-wide concerns that affect every page: dark/light mode and Arabic/English with RTL/LTR layout.

---

## 1. Theming (Dark / Light Mode)

### State
- Managed by `store/theme.store.ts` — a Zustand store persisted to `localStorage` under the key `makhzoon-theme` (via `persist` middleware).
- State field: `theme` — values: `'light'` | `'dark'` | `'system'` (default `'system'`).
- `ThemeToggle` component (`components/shared/ThemeToggle.tsx`) renders a sun/moon/monitor icon button that opens a dropdown with all three options (Light / Dark / System), each calling `setTheme(option)` from the store — there is no `toggleTheme()`.

### How it works
- `app/layout.tsx` inlines a blocking `<script>` (`theme-init`) that reads `makhzoon-theme` from `localStorage` before hydration, resolves `'system'` via `prefers-color-scheme`, and adds the `dark` class (plus `data-theme="dark"|"light"`) to `<html>` to prevent a flash of the wrong theme.
- Tailwind CSS is configured with `darkMode: 'class'`, so all `dark:` utility variants activate when `.dark` is on `<html>`.
- CSS variables (`--primary-*`, `--gray-*`, `--surface-*`, `--border-*`) are declared in `app/globals.css` with separate `:root` and `.dark` blocks, so colors swap without any inline style logic.

### Coverage
- Every UI component (buttons, inputs, dialogs, dropdowns, tables, badges, sidebars, headers, cards) has full `dark:` variants.
- Radix UI `DropdownMenuContent` and all its sub-components have explicit dark variants applied in `components/ui/dropdown-menu.tsx`.
- Marketing pages have their own color scheme and are not affected by the dark/light toggle.

### Where the toggle appears
- **Org portal** — `components/layout/AppHeader.tsx` (right-side action icons).
- **Superadmin portal** — `components/layout/SuperAdminBanner.tsx` (top banner right side).

---

## 2. Localization (Arabic / English)

### Supported locales
| Code | Language | Direction |
|------|----------|-----------|
| `en` | English | LTR |
| `ar` | Arabic | RTL |

### State
- Managed by `store/locale.store.ts` — a Zustand store persisted to `localStorage` under the key `makhzoon-locale`.
- `LanguageToggle` component (`components/shared/LanguageToggle.tsx`) also writes the choice to a `makhzoon-locale` **cookie** directly (not via the store) so `middleware.ts` can read it on the next request, then navigates (`router.push`) to the same path with the new locale prefix — it does not do a full reload.

### URL structure
All user-facing URLs are prefixed with the locale: `/{locale}/...`. Examples:
- `/en/acme/main/usool/list`
- `/ar/acme/main/usool/list`

Locale resolution order in `middleware.ts` (`detectLocale`): `makhzoon-locale` cookie → `Accept-Language` header (starts with `ar` → Arabic) → default `en`. On first visit with neither a cookie nor an Arabic `Accept-Language`, it defaults to `en` and redirects to the prefixed URL.

### Translation strings
- Single source of truth: `locales/messages.ts` — exports a `messages` object with both `en` and `ar` keys.
- Every user-visible string is a key in this file — no hardcoded English scattered in components.
- Module names are translated:
  | Key | EN | AR |
  |-----|----|----|
  | `nav.assets` | Usool | أصول |
  | `nav.inventory` | Raseed | رصيد |
  | `nav.pos` | Haraka | حركة |

### `useT()` hook
Located in `hooks/ui/useT.ts`, backed by `LocaleContext`. Returns:
- `t(key, fallback?)` — looks up the translation for the current locale, falling back to `fallback` then the raw key if missing.
- `locale` — `'en'` | `'ar'` (there is no separate `lang` field).
- `dir` — `'ltr'` | `'rtl'`

All components use `useT()` — never `t()` from a library or hardcoded strings.

### RTL layout
- The root layout sets `<html lang={locale} dir={dir}>` so the browser applies RTL layout natively.
- All Tailwind spacing (padding, margin, flex direction) uses logical properties (`ps`, `pe`, `ms`, `me`) or directional-aware utilities where needed.
- Sidebar, modals, dropdowns, and tables all render correctly in RTL.
- Framer Motion animations (sidebar collapse, page transitions) are direction-aware.

### Sidebar module subtitle
> Known issue: this doc previously described the sidebar showing the Arabic module name as a subtitle beneath the English label (e.g. "Usool" / "أصول") in English locale. No such logic exists in `components/layout/AppSidebar.tsx` — nav labels are looked up via `t(labelKey)` for the current locale only, with no dual-language rendering. Module display names (`nav.assets`, `nav.inventory`, `nav.pos`) are documented above but only render in one language at a time.

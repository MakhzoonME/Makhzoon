# Theming & Localization

App-wide concerns that affect every page: dark/light mode and Arabic/English with RTL/LTR layout.

---

## 1. Theming (Dark / Light Mode)

### State
- Managed by `store/theme.store.ts` — a Zustand store that persists preference to `localStorage`.
- Key: `theme` — values: `'light'` | `'dark'`.
- `ThemeToggle` component (`components/shared/ThemeToggle.tsx`) renders a sun/moon icon button that calls `toggleTheme()` from the store.

### How it works
- The root `<html>` element receives the `dark` class when dark mode is active (Next.js root layout reads from the store on hydration).
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
- Managed by `store/locale.store.ts` — persists choice to the `makhzoon-locale` cookie (read by `middleware.ts` on the next request).
- `LanguageToggle` component renders an `EN / AR` switcher that sets the cookie and reloads to the same path with the new locale prefix.

### URL structure
All user-facing URLs are prefixed with the locale: `/{locale}/...`. Examples:
- `/en/acme/main/usool/list`
- `/ar/acme/main/usool/list`

On first visit (no cookie, no Accept-Language match), the middleware defaults to `en` and redirects to the prefixed URL.

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
Located in `hooks/ui/`. Returns:
- `t(key)` — looks up the translation for the current locale.
- `lang` — `'en'` | `'ar'`
- `dir` — `'ltr'` | `'rtl'`

All components use `useT()` — never `t()` from a library or hardcoded strings.

### RTL layout
- The root layout sets `<html lang={locale} dir={dir}>` so the browser applies RTL layout natively.
- All Tailwind spacing (padding, margin, flex direction) uses logical properties (`ps`, `pe`, `ms`, `me`) or directional-aware utilities where needed.
- Sidebar, modals, dropdowns, and tables all render correctly in RTL.
- Framer Motion animations (sidebar collapse, page transitions) are direction-aware.

### Sidebar module subtitle
In English locale, the sidebar shows the Arabic module name as a small subtitle beneath the English label — e.g., "Usool" with "أصول" below it — to reinforce the bilingual brand identity.

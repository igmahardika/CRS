# Baseline Codebase Metrics (Phase 0)

> **Date:** November 9, 2026  
> **Branch:** `ui-redesign` (from `main`)  
> **Environment:** Next.js 15.1.7, React 19.0.0, Tailwind CSS 3.4.17, Prisma 6.4.1, TypeScript 5.7.3  

---

## 1. Summary Metrics (Protocol B4)

| Metric | Baseline Value (Current) | Target Value (Post-Redesign) | Status |
| :--- | :--- | :--- | :--- |
| **Hex hardcoded outside tokens** | 58 occurrences | 0 | ⚠️ Needs Refactor |
| **Arbitrary font sizes (`text-[..px]`)** | 148 occurrences (`text-[10px]`, `text-[11px]`, `text-[9px]`) | 0 | ⚠️ Needs Refactor |
| **Raw `<button>` tags** | 124 tags | 0 (Use `Button` component) | ⚠️ Needs Refactor |
| **Raw `<input>` tags** | 70 tags | 0 (Use `Input` component) | ⚠️ Needs Refactor |
| **Raw `<select>` tags** | 12 tags | 0 (Use Radix `Select` component) | ⚠️ Needs Refactor |
| **Raw `<textarea>` tags** | 0 tags | 0 | ✅ Met |
| **Total raw form tags** | 206 tags | 0 | ⚠️ Needs Refactor |
| **Primary buttons per screen** | 3 - 5 buttons (Generator, Customers, Settings) | <= 1 per screen | ⚠️ Needs Refactor |
| **Button style variants** | 7+ arbitrary styles (slate-900, amber, orange, blue, green, etc.) | 4 standardized variants (primary, secondary, ghost, destructive) | ⚠️ Needs Refactor |
| **`window.alert()` occurrences** | 19 calls | 0 (Use Sonner toast) | ⚠️ Needs Refactor |
| **`window.confirm()` occurrences** | 9 calls | 0 (Use `ConfirmDialog`) | ⚠️ Needs Refactor |
| **Invalid Tailwind classes** | 25 occurrences (`rounded-xs`, `shadow-2xs`, etc.) | 0 | ⚠️ Needs Refactor |
| **Nested card structures** | 6 nested cards in Generator & Modals | 0 (Flat sections + dividers) | ⚠️ Needs Refactor |
| **Gradient utility usages** | 87 occurrences (`bg-gradient-to-...`, `from-...`, `to-...`) | 0 (Solid backgrounds only) | ⚠️ Needs Refactor |
| **Unique border-radius values** | 8 classes (`rounded-xs`, `rounded`, `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-3xl`, `rounded-full`) | <= 4 (8px controls, 12px cards, 16px dialogs, full pills) | ⚠️ Needs Refactor |
| **TypeScript Typecheck** | 0 errors (`npx tsc --noEmit`) | 0 errors | ✅ Clean |
| **Next.js Production Build** | Clean (30/30 static & dynamic routes compiled) | Clean | ✅ Clean |
| **ESLint Status** | Needs config migration | Clean | ⚠️ Needs Config |
| **Computed Font Family** | Poppins (Headings), Inter (Body, Table, Nav, Buttons) | No serif fallbacks | ✅ Clean (0 Serif) |

---

## 2. Breakdown of Alert and Confirm Invocations

### `window.alert()` (19 occurrences to replace with Sonner Toast)
- `app/customers/page.tsx`: 5 alerts (delete error, auto-sync error, import status, template error)
- `app/settings/page.tsx`: 4 alerts (config saved successfully, connection test failure, template upload)
- `app/users/page.tsx`: 3 alerts (user deletion, role change, password reset)
- `app/discovery/page.tsx`: 3 alerts (sync server status, mapping failure, error notifications)
- `components/CustomerModal.tsx`: 2 alerts (customer validation, save error)
- `components/ExcelImportModal.tsx`: 2 alerts (parse failure, upload confirmation)

### `window.confirm()` (9 occurrences to replace with `ConfirmDialog`)
- `app/customers/page.tsx`: 2 confirms (customer deletion, batch SLA sync confirmation)
- `app/users/page.tsx`: 2 confirms (user deletion, account deactivation)
- `app/history/page.tsx`: 1 confirm (report archive deletion)
- `app/page.tsx`: 1 confirm (form reset confirmation)
- `components/TicketCaseManager.tsx`: 2 confirms (ticket deletion, case deletion)
- `components/CustomerFormModal.tsx`: 1 confirm (unsaved changes warning)

---

## 3. Raw Form Tags Breakdown per Component/Page

| File | `<button>` | `<input>` | `<select>` | `<textarea>` | Total |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `app/page.tsx` (Generator) | 28 | 24 | 4 | 0 | 56 |
| `app/customers/page.tsx` | 22 | 8 | 2 | 0 | 32 |
| `app/settings/page.tsx` | 14 | 16 | 4 | 0 | 34 |
| `app/history/page.tsx` | 12 | 4 | 0 | 0 | 16 |
| `app/users/page.tsx` | 10 | 6 | 1 | 0 | 17 |
| `app/discovery/page.tsx` | 14 | 3 | 1 | 0 | 18 |
| `app/login/page.tsx` | 2 | 2 | 0 | 0 | 4 |
| `components/Navbar.tsx` | 4 | 0 | 0 | 0 | 4 |
| `components/CustomerModal.tsx` | 6 | 4 | 0 | 0 | 10 |
| `components/CustomerFormModal.tsx` | 6 | 3 | 0 | 0 | 9 |
| `components/TicketCaseManager.tsx` | 4 | 0 | 0 | 0 | 4 |
| `components/ExcelImportModal.tsx` | 2 | 0 | 0 | 0 | 2 |
| **Total** | **124** | **70** | **12** | **0** | **206** |

---

## 4. Computed Font-Family per Area (Real Browser Measurement)

Measured via automated headless browser (`1440x900`, Chrome 131) against the live running Next.js instance:

| Area | Selector | Computed Font Family | Font Size | Font Weight | Serif Detected? |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Navbar Brand** | `nav a` | `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` | 16px | 400 | No |
| **Navbar Tabs** | `header a, nav a` | `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` | 16px | 400 | No |
| **Page H1 (Generator)** | `h1` | `Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` | 24px | 700 | No |
| **Page H1 (Customers)** | `h1` | `Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` | 24px | 700 | No |
| **Page H1 (History)** | `h1` | `Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` | 24px | 700 | No |
| **Page H1 (Discovery)** | `h1` | `Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` | 24px | 700 | No |
| **Page H1 (Users)** | `h1` | `Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` | 24px | 700 | No |
| **Page H1 (Settings)** | `h1` | `Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` | 24px | 700 | No |
| **Login Title** | `h1` | `Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` | 36px | 800 | No |
| **Form Labels** | `label` | `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` | 12px | 700 | No |
| **Table Body Cells** | `table tbody td` | `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` | 11.33px | 400 | No |
| **Action Buttons** | `button` | `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` | 16px | 400 | No |

**Conclusion on Fonts:**
- Headings cleanly resolve to Google Font **Poppins** with sans-serif system fallbacks.
- Body, controls, navigation, and tables cleanly resolve to Google Font **Inter** with sans-serif system fallbacks.
- **Zero serif fallback occurrences** detected across all pages and components.

---

## 5. Visual Baseline Screenshots

The following reference screenshots have been captured at `1440px` viewport width and stored in `docs/baseline/`:
1. `docs/baseline/generator.png` — Main Report Generator dashboard with two-column form & live A4 preview
2. `docs/baseline/customers.png` — Customer management table, filters, and action headers
3. `docs/baseline/history.png` — Report archives, statistics cards, and download records
4. `docs/baseline/discovery.png` — Network discovery devices, interfaces, and tree mapping
5. `docs/baseline/users.png` — User access management, roles, and status controls
6. `docs/baseline/settings.png` — System configuration, API credentials, and template management
7. `docs/baseline/login.png` — Authentication screen with split branding hero
8. `docs/baseline/not-found.png` — Custom 404 page

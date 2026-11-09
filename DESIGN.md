# DESIGN TOKENS & SYSTEM SPECIFICATION (GENRE REPORTING v3)

> **Authority:** This document is the supreme design authority for the GENRE REPORTING redesign.  
> It codifies the rules in **Section A (Aturan Besi)**, incorporating insights from `ui_ux_pro_max` while strictly upholding Nexa's enterprise visual identity.

---

## 1. Skill Integration Rationale (`ui_ux_pro_max`)

The `ui_ux_pro_max` design intelligence skill was executed for `"enterprise network SLA reporting dashboard"`.

### Adopted from Skill:
- **Style archetype:** *"Data-Dense Dashboard"* — high spatial efficiency, 4px/8px grid system, minimal padding, prominent tabular numerical displays, sticky table headers, clean KPI metric cards.
- **Micro-interactions:** Row highlighting on hover (`hover:bg-slate-50/70`), smooth transitions (`150ms-200ms ease`), keyboard focus-visible rings for WCAG AA compliance, skeleton loaders for asynchronous queries.
- **Anti-patterns strictly avoided:** No emojis as icons (use Lucide SVG only), no ornate/gilded widgets, no decorative clutter, no multiple competing primary actions.

### Rejected / Overridden by Section A:
- **Dark Mode Palette (`#020617` / `#0F172A` / `#22C55E`):** **REJECTED.** Section A mandates the clean enterprise light palette with `#F8FAFC` page background, pure white surface cards, slate borders, and Nexa single orange accent.
- **Typography (`Fira Code` / `Fira Sans`):** **REJECTED.** Section A mandates brand continuity: **Poppins** (400/500/600) for brand & headings, and **Inter** (400/500/600) for UI body, tables, and controls.
- **Public Gateway Pattern:** **REJECTED.** This application is an authenticated internal operations portal, not a public marketing landing page.

---

## 2. Design Tokens (Rule A5)

### 2.1 Color Tokens
The interface employs a single accent color: **Nexa Orange**, calibrated across 4 distinct functional roles to ensure 100% WCAG AA contrast (minimum 4.5:1 ratio):

| Token Name | Hex Code | Role & Usage Restrictions |
| :--- | :--- | :--- |
| `--primary-brand` | `#F16614` | Nexa logo and large non-text brand elements only. Never use for small text. |
| `--primary` | `#EA580C` | Primary button background. Yields >4.5:1 contrast against pure white text. Solid only (no gradients). |
| `--primary-strong` | `#C2410C` | Orange text, links, and icons on white backgrounds; primary button hover state. |
| `--primary-soft` | `#FFF7ED` | Active navigation tab pill background, gentle row/card hover highlights. |
| `--ring` | `rgba(234, 88, 12, 0.4)` | 40% opacity orange ring for visible keyboard focus states (`focus-visible`). |

#### Neutral & Surface Tokens:
- **Page Background:** `#F8FAFC` (`bg-slate-50`)
- **Card Surface:** `#FFFFFF` (`bg-white`)
- **Border:** `#E2E8F0` (`border-slate-200`)
- **Subtle Surface / Muted:** `#F1F5F9` (`bg-slate-100`)

#### Text Hierarchy:
- **Primary Text:** `#0F172A` (`text-slate-900`) — Headings, table data, active values.
- **Secondary Text:** `#475569` (`text-slate-600`) — Section labels, navigation links.
- **Muted Text:** `#64748B` (`text-slate-500`) — Helper text, table column headers, metadata.
- *Strict Prohibition:* `text-slate-400` is **forbidden** for readable text (fails 4.5:1 contrast). Only allowed for subtle placeholder text.

#### Semantic Status Tokens (Strictly Semantic Only — No Decorative Colors):
- **Success / Online / Met:** `#16A34A` (`text-emerald-600`, `bg-emerald-50`, `border-emerald-200`)
- **Destructive / Error / Downtime:** `#DC2626` (`text-red-600`, `bg-red-50`, `border-red-200`)
- **Warning / Degraded:** `#D97706` (`text-amber-600`, `bg-amber-50`, `border-amber-200`)
- **Info / Diagnostic:** `#2563EB` (`text-blue-600`, `bg-blue-50`, `border-blue-200`)

---

### 2.2 Typography Scale (Strict 6-Step Hierarchy)

Only 6 font sizes are permitted across the entire application: **12 / 13 / 14 / 16 / 20 / 24 px**.  
Arbitrary `text-[..px]` utilities are strictly prohibited (except inside print canvas pt rules).

| Scale Step | Font Family | Size / Line-Height / Weight | Applied Elements |
| :--- | :--- | :--- | :--- |
| **Page Title** | Poppins | `24px` / `32px` (600 semi-bold) | Single `<h1>` page heading per view. |
| **Section Title** | Poppins | `16px` / `24px` (600 semi-bold) | Card headings, major section titles. |
| **Subheading** | Poppins | `14px` / `20px` (500 medium) | Modal titles, sub-card groupings. |
| **Control Label** | Inter | `13px` / `18px` (500 medium) | Form input labels (max 3 words). |
| **Body / Table** | Inter | `13px` / `20px` (400 regular) | Table cell data, descriptions, form values. |
| **Table Header** | Inter | `12px` / `16px` (500 medium) | Column headers (`uppercase text-slate-500 tracking-wider`). |
| **Badges / Meta** | Inter | `12px` / `16px` (500 medium) | Semantic status badges, metadata tags. |

- **Numerical Data:** Must always specify `.tabular-nums` for aligned columns in tables and stat cards.
- **Monospace Font:** Restricted exclusively to Technical IDs (`graphId`, `sensorId`), URLs, and Document Numbers.

---

### 2.3 Shapes, Spacing & Elevation (Rule A5)

- **Grid Spacing:** Strict 4px base increment (`p-1` = 4px, `p-2` = 8px, `p-3` = 12px, `p-4` = 16px, `p-5` = 20px, `p-6` = 24px).
- **Section Gap:** Exactly `24px` (`gap-6` or `space-y-6`).
- **Card Padding:** `20px` - `24px` (`p-5` to `p-6`).

#### Radius Token Scale (Only 4 Unique Radius Values Permitted):
1. **8px (`rounded-lg`):** Controls (Button, Input, Select, Textarea, small badges).
2. **12px (`rounded-xl`):** Cards, content containers, StatCards.
3. **16px (`rounded-2xl`):** Modals, Dialogs, Sheet drawers.
4. **Full (`rounded-full`):** Segmented pill navigation, status dots, user avatars.

#### Elevation / Shadows:
- **Cards & Tables:** `shadow-sm` border-slate-200.
- **Dropdowns & Popovers:** `shadow-lg` border-slate-200.
- **Modals & Dialogs:** `shadow-xl` with backdrop blur (`bg-slate-900/40 backdrop-blur-sm`).
- *Strict Prohibition:* No glow effects, no 3D button skeuomorphism, no scale-on-click transforms.

#### Iconography:
- Exclusively **`lucide-react`** SVG icons.
- Sizes: `16px` (`w-4 h-4`) inline, `20px` (`w-5 h-5`) for headers/standalone.
- Stroke width: `1.75` for visual balance.
- **Icon Chip Standard:** Single uniform appearance — `bg-slate-100` square with `text-slate-600` icon. Colored icon chips are strictly forbidden.

---

## 3. Component Architecture (`components/ui/`)

Every reusable UI element must reside in `components/ui/` with standardized props, keyboard navigation, and interactive states:

1. **`Button`**: 4 variants only (`primary`, `secondary`, `ghost`, `destructive`) x 2 sizes (`sm`: 32px, `md`: 36px). Max 1 primary button per screen.
2. **`Input`**: Standardized 36px/32px input with error state and focus ring.
3. **`Label`**: Radix Label, 13px font-medium, concise wording (max 3 words).
4. **`Select`**: Radix UI Select with custom dropdown styling.
5. **`Textarea`**: Auto-resizing textarea with standard focus ring.
6. **`Checkbox`**: Radix Checkbox with orange primary fill.
7. **`Badge`**: Semantic status indicator (neutral, success, destructive, warning, info, soft).
8. **`Tabs`**: Radix UI Tabs for section switching.
9. **`SegmentedControl`**: Clean pill-style segmented tab group.
10. **`Dialog`**: Radix Dialog with 16px radius and smooth backdrop.
11. **`ConfirmDialog`**: Specialized modal for destructive operations naming the target item.
12. **`DropdownMenu`**: Radix DropdownMenu for kebab actions and user profile.
13. **`Table`**: Standard 44px row height, sticky header, tabular numbers.
14. **`Skeleton`**: Subtle animated placeholder for loading states.
15. **`EmptyState`**: 1-sentence explanation + 1 primary action.
16. **`PageHeader`**: Standard 24px/600 title left, actions right.
17. **`Spinner`**: Consistent SVG loading indicator.
18. **`FormField`**: Label + Input + Error message composition.
19. **`StatCard`**: Single-style KPI card with slate-100 icon chip.

---

## 4. Standard Page Layout Patterns

### 4.1 Shell Layout
- Max container width: `1440px` centered (`max-w-[1440px] mx-auto px-6`).
- Navigation:
  - Top bar with Nexa brand icon + clean title.
  - Active tab: soft orange pill (`bg-[#FFF7ED] text-[#C2410C] font-semibold`).
  - Inactive tabs: slate-600 with slate-900 hover.
  - User menu: right-aligned avatar triggering dropdown menu.

### 4.2 Data Management View (Customers, Users, History)
- Top: `PageHeader` with single primary action (e.g. "Add Customer").
- Secondary / bulk actions grouped in DropdownMenu ("More").
- Filter toolbar: Search input + Select filters + SegmentedControl.
- Table: 44px rows, sticky header, kebab menu for edit/delete.

### 4.3 Report Generator View (Phase 5)
- Two columns: Left form (480-560px), Right preview sticky.
- Flat cards with Poppins 16/600 titles (no nested cards).
- Single primary button: "Export PDF".
- SLA Availability bar: Compact sticky white bar with semantic green/red indicator.

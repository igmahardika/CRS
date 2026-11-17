# GENRE REPORTING — UI/UX Design System & Architectural Rules

> **Version:** 1.0.0  
> **Status:** Active Standard  
> **Default Language:** English (EN-US)  
> **Design Philosophy:** Clean Industrial Telemetry & Progressive Disclosure

---

## 1. Core Design Philosophy

GENRE REPORTING is an enterprise network compliance and reporting platform used by NOC engineers, supervisors, and department managers. The user interface must emphasize **speed, visual clarity, data density, and high scan-efficiency**.

### Golden Rule: Progressive Disclosure Over Descriptive Bloat
1. **Zero Text Clutter in Cards:** Cards, form groups, and dialog surfaces must never display static explanatory prose, format formulas, or redundant instructional paragraphs.
2. **Context on Demand:** All secondary context, technical specifications, sequence formulas, and routing explanations must live inside **Tooltips** activated on user hover or focus (`InfoTooltip` / `HelpTooltip`).
3. **Primary Focus on Action & Data:** The screen must only present what the operator controls or the data the operator needs to inspect. Everything else is secondary.

---

## 2. Microcopy & Language Standards

### 2.1 Default Language
* **English (EN-US)** is the mandatory default language for all UI elements, navigation, modal dialogs, status badges, buttons, tooltips, and toast notifications.
* Indonesian terms should only remain if they represent fixed company organizational identifiers (e.g., standard internal department acronyms if mandated). All generic UI copy must be clean, natural English.

### 2.2 Writing in Design Rules
* **No Filler Words:** Eliminate phrases like *"Supports direct...", "Click here to...", "This field allows you to...", "Please note that..."*.
* **Action-Oriented Verbs:**
  * Use `Generate Report`, not `Submit Report Generation`
  * Use `Save Settings`, not `Update Configuration Records`
  * Use `Paste Excel`, not `Click to Paste Helpdesk Data from Clipboard`
  * Use `Request Revision`, not `Send Evaluation Notes to Team`
* **Sentence Case:** Labels, buttons, and section titles must use sentence case or title case consistently:
  * Title Case for Page Headers and Modals (`Report Generator`, `Customer Directory`)
  * Sentence / Title Case for buttons (`Generate Report`, `Paste Excel`, `Save Changes`)
  * Clean nouns for form labels (`Document Number`, `Traffic Direction`, `Sensor ID`)

### 2.3 Typography: Strict Monospace Prohibition
* **Monospace Fonts Strictly Prohibited:** Never use monospace fonts (`font-mono`, `Consolas`, `Courier`, `SFMono`, etc.) in the user interface.
* **Proportional Sans-Serif Everywhere:** All document numbers, Service IDs, Customer IDs, IP addresses, dates, timestamps, and metric values must use `font-sans` (`Inter`).
* **Numeric Column Alignment:** When numbers or tabular lists need uniform character alignment, use the Tailwind CSS class `tabular-nums` (which enables `font-feature-settings: 'tnum'` in sans-serif) rather than switching to a monospace font.
* **Headings:** Use `font-heading` (`Poppins`) for page and modal titles.

---

## 3. Card & Form Architecture

### 3.1 Anatomy of a Clean Form Field
```
[Label] [ℹ️ InfoTooltip (Optional)]
[=================== Input / Select / Control ===================]
[Error Message (Dynamic only when invalid)]
```
* **Forbidden:** Never place a static `<p className="text-xs text-slate-500">` under an input explaining what the input is for or detailing its formatting template.
* **Format Formulas:** Must be placed inside an `InfoTooltip` next to the label, e.g.:
  ```tsx
  <div className="flex items-center gap-1.5 mb-1.5">
    <label className="text-xs font-medium text-slate-700">Document Number</label>
    <InfoTooltip content="Auto sequence format: {01}/{DocPrefix}/{ReportType}/{Month}/{Year}" />
  </div>
  ```

### 3.2 Target Department & Approval Tiers
* Do not display multi-line explanations stating *"Internal NOC document (completed after NOC supervisor review)"*.
* Instead, display a compact badge with a tooltip:
  * Badge: `1-Tier (Internal)` or `2-Tier (Department)`
  * Tooltip: `1-Tier: Direct NOC supervisor authorization. Ready immediately upon approval.` vs `2-Tier: Requires technical NOC review followed by secondary department supervisor sign-off.`

### 3.3 Traffic Direction & Integration Controls
* Button selector options must remain compact and single-line:
  * `Normal` (Tooltip: `Port ingress is Download, egress is Upload`)
  * `Reversed` (Tooltip: `Port egress is Download, ingress is Upload`)
* Do not print redundant sub-text like *"Switch port or sensor mapping"* or *"Auto-populated or manual"*.

---

## 4. Tooltip System Specification

### 4.1 Component Primitive (`InfoTooltip`)
All tooltips must adhere to standard accessibility and visual constraints:
* **Trigger:** An un-intrusive icon button (`Info` or `HelpCircle`, 14px size / `w-3.5 h-3.5`, `text-slate-400 hover:text-slate-600`).
* **Visual Theme:**
  * Background: `bg-slate-900`
  * Text: `text-slate-100 text-[11px] leading-relaxed font-sans`
  * Padding: `py-1 px-2.5 rounded-md shadow-md border border-slate-800`
  * Max Width: `max-w-xs`
* **Delay:** Instant or 150ms open delay to feel responsive without flickering.

### 4.2 Tooltip Decision Matrix
| Situation | Use Inline Text? | Use Tooltip? |
| :--- | :---: | :---: |
| Required field indicator (`*`) | Yes | No |
| Validation error message | Yes (inline red) | No |
| Format explanation (e.g., regex/mask/sequence) | No | **Yes** |
| Background info / routing explanation | No | **Yes** |
| External server mapping details | No | **Yes** |
| Table cell secondary metadata (timestamps/IDs) | Truncated/Compact | **Yes on Hover** |

---

## 5. Table & List Layout Density

1. **Single-Line Cell Rule:** Table cells must not stack more than two vertical text lines.
2. **Metadata Badges:** Detailed status breakdown (e.g., *"Within 24h"*, *"Processed by Staff"*, *"Due at 17:00"*) must be encapsulated into the badge hover tooltip rather than rendered as separate sub-spans.
3. **Empty States:** Empty states must provide a clear icon, a 1-sentence explanation, and at most one clear call-to-action button. Never write redundant instructions on how to use surrounding buttons.

---

## 6. Modal & Dialog Rules

1. **DialogHeader:**
   * Contains only `DialogTitle` (e.g., `Paste Excel Data`, `Import Customers`).
   * Never insert paragraphs into `DialogDescription` unless communicating an irreversible high-risk warning.
2. **DialogFooter:**
   * Exclusively contains action buttons (`Cancel`, `Save`, `Import`).
   * Never put persistent helper notes or disclaimer texts in modal footers.

---

## 7. Change Management & Compliance Verification

Whenever any page, card, or modal is added or refactored:
1. Verify against the **Zero Text Clutter** rule.
2. Ensure all UI copy is in **English**.
3. Verify keyboard accessibility (`Tab` reaches tooltip triggers; tooltips dismiss on `Escape`).
4. Run standard TypeScript build checks to ensure zero regressions.

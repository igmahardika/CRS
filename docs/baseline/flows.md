# Critical User Workflows & Regression Test Plan (Phase 0)

> This document defines the 17 core operational flows of the **GENRE REPORTING** system.  
> As mandated by **Rule A2 (Business Logic Integrity)** and **Rule B3 (Self-Review Regression Testing)**, every visual redesign phase must re-verify that these functional workflows remain 100% operational and produce byte-for-byte / value-for-value identical business outcomes.

---

## Flow 1: Authentication & Session Management (Login / Logout)
- **Primary Route:** `/login`
- **Backend API:** `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- **Pre-conditions:** System initialized with admin account (`admin` / `admin123`).
- **Test Steps:**
  1. Access `http://localhost:3000/login` in an unauthenticated browser session.
  2. Enter valid credentials: Username `admin`, Password `admin123`.
  3. Submit the form via "Sign In" button.
  4. Verify response sets HTTP-only cookie `mrtg_sla_session` and redirects to `/`.
  5. Test invalid credentials (`admin` / `wrongpassword`); verify error message displayed without page crash.
  6. From the authenticated app bar, click "Logout"; verify session cookie is cleared and redirected back to `/login`.
- **Expected Outcome:** Proper session cookie established; RBAC guards protect admin routes (`/users`, `/settings`).

---

## Flow 2: Customer Selection (Picker & Shortcut)
- **Primary Route:** `/` (Report Generator)
- **Component:** `CustomerModal.tsx`
- **Shortcut:** `Ctrl + Shift + K`
- **Test Steps:**
  1. From Generator page, press `Ctrl + Shift + K` or click "Select Customer".
  2. Modal opens displaying customer list, search bar, and filters.
  3. Search for "RSJ. Dr. Soeharto Heerdjan" or "Linknet".
  4. Click on the customer item.
  5. Modal closes and auto-populates Generator form fields:
     - Customer Name
     - Customer ID
     - Service ID
     - Service Name
     - Node Count
     - Target SLA
     - Traffic Direction (`NORMAL` or `REVERSED`)
     - Cacti Graph ID / PRTG Sensor ID
- **Expected Outcome:** All metadata binds seamlessly to state and triggers live preview header update.

---

## Flow 3: Fetch MRTG / Cacti Graph Data
- **Primary Route:** `/`
- **Backend API:** `POST /api/cacti/graph`
- **Test Steps:**
  1. Ensure Cacti Graph ID is populated (e.g., `2180`).
  2. Select Report Type "MRTG Report" or "SLA Report".
  3. Click "Fetch Cacti".
  4. The system sends request to `/api/cacti/graph` using configured Cacti credentials.
  5. On mock or production response, verify:
     - Graph preview image is loaded into the canvas.
     - Inbound / Outbound traffic metrics (Avg, Max, Current, Unit) are extracted and populated into numeric inputs.
- **Expected Outcome:** Graph image base64 renders in preview; traffic inputs populate accurately.

---

## Flow 4: Fetch PRTG Sensor Data
- **Primary Route:** `/`
- **Backend API:** `POST /api/prtg/graph`
- **Test Steps:**
  1. Switch Graph Engine / Source to "PRTG".
  2. Ensure PRTG Sensor ID is populated (e.g., `1496` or active object ID).
  3. Click "Fetch PRTG".
  4. The system queries `/api/prtg/graph` with selected time period.
  5. Verify PRTG graph image is fetched and traffic bandwidth stats are updated.
- **Expected Outcome:** Traffic values update without overwriting customer identity data.

---

## Flow 5: Traffic Direction Toggle (Normal vs Reversed)
- **Primary Route:** `/`
- **Business Rule:** In NEXA networking:
  - `NORMAL`: Download = Inbound Traffic, Upload = Outbound Traffic.
  - `REVERSED`: Download = Outbound Traffic, Upload = Inbound Traffic.
- **Test Steps:**
  1. Note current Download Average (`dlAvg`) and Upload Average (`ulAvg`).
  2. Toggle Traffic Direction from "NORMAL" to "REVERSED".
  3. Verify the mapped fields swap appropriately in the preview table and summary sentence.
  4. Toggle back to "NORMAL"; verify values return to their respective origins.
- **Expected Outcome:** Metrics flip accurately in calculation and PDF preview.

---

## Flow 6: Support Tickets Management (CRUD in Generator)
- **Primary Route:** `/`
- **Component:** `TicketCaseManager.tsx`
- **Test Steps:**
  1. In "Support Tickets" section, click "Add Ticket".
  2. Enter Ticket Number (e.g. `TKT-2026-1001`), Date, Subject/Description, and Action.
  3. Verify ticket appears in live preview table under "Support Tickets".
  4. Edit ticket content; verify preview updates in real-time.
  5. Click Delete icon on the ticket; confirm removal via dialog.
  6. When 0 tickets exist, verify preview displays empty state placeholder (`-`).
- **Expected Outcome:** Tickets array serializes cleanly to JSON for report persistence.

---

## Flow 7: Downtime Cases Management
- **Primary Route:** `/`
- **Component:** `TicketCaseManager.tsx`
- **Test Steps:**
  1. In "Downtime Cases" section, click "Add Case".
  2. Enter Case Number (e.g. `CS-2026-081`), Date, Root Cause, Action Taken, and Downtime Minutes (e.g. `120`).
  3. Verify case is added to the table.
  4. Verify Downtime Duration automatically formats (e.g. `120` mins -> `2 hrs`).
  5. Delete downtime case; verify SLA availability re-calculates to 100.00%.
- **Expected Outcome:** Case duration formatting and validation adhere strictly to `lib/sla-calculator.ts`.

---

## Flow 8: SLA Calculation Engine
- **Primary Logic:** `lib/sla-calculator.ts` (`calculateSla`)
- **Formula:**
  - $TotalMinutes = DaysInMonth \times 24 \times 60$ (e.g. October = 31 days = 44,640 mins)
  - $DowntimePercent = \frac{TotalDowntimeMinutes}{TotalMinutes} \times 100$ (clamped 0 - 100, 2 decimals)
  - $OnlinePercent = 100 - DowntimePercent$ (clamped 0 - 100, 2 decimals)
  - $AvailabilityPercent = OnlinePercent$
- **Test Steps:**
  1. Set Period to October 2026 (31 days = 44,640 total minutes).
  2. With 0 downtime: Verify Downtime = `0.00%`, Availability = `100.00%`.
  3. Add downtime case of 446.4 minutes:
     - Verify Downtime = `1.00%`.
     - Verify Availability = `99.00%`.
  4. Compare with Customer Target SLA (e.g. 99.50%):
     - Availability 99.00% < Target 99.50% -> Status: SLA Breached / Not Achieved (Semantic Red).
  5. Remove downtime:
     - Availability 100.00% >= Target 99.50% -> Status: SLA Achieved (Semantic Green).
- **Expected Outcome:** Floating point math is rounded to exactly 2 decimals and adheres to NEXA contractual SLA definitions.

---

## Flow 9: PDF Export Generation (Puppeteer Engine)
- **Primary Route:** `/` -> `/api/generate-pdf`
- **Engine:** `lib/pdf-generator.ts` + `lib/pdf-template.ts`
- **Test Steps:**
  1. On the Generator screen with valid customer and data, click "Export PDF".
  2. System posts full `ReportData` payload to `/api/generate-pdf`.
  3. Headless Chromium generates A4 pages (Cover page + Content page(s)).
  4. Browser triggers file download: `REPORT [TYPE] - [Customer Name] - [Period].pdf`.
  5. Open generated PDF: verify layout, high-res background, company logo, tables, typography, and page numbers.
- **Expected Outcome:** PDF renders pixel-perfect without missing fonts, clipped tables, or blank pages.

---

## Flow 10: Save & Archive Report
- **Primary Route:** `/` -> `POST /api/reports`
- **Test Steps:**
  1. Click "Save & Archive" button.
  2. System saves report record in SQLite `Report` table with full state snapshot (JSON tickets, cases, metrics, PDF path).
  3. Success notification displays confirmation.
  4. Navigate to `/history`; verify saved report appears at the top of the history table.
- **Expected Outcome:** Complete report state is persisted with unique document number.

---

## Flow 11: History Archive Download & Inspection
- **Primary Route:** `/history`
- **Backend API:** `GET /api/reports`, `GET /api/reports/download?id=...`, `DELETE /api/reports?id=...`
- **Test Steps:**
  1. Access `/history`.
  2. Verify 4 summary StatCards (Total Reports, MRTG Reports, SLA Reports, Avg Availability).
  3. Filter by Report Type or Customer Name search.
  4. Click "Download" on any archived report: verify PDF stream downloads correctly.
  5. Click Delete on an archived report; confirm action; verify table refreshes and count updates.
- **Expected Outcome:** Archive records are downloadable, filterable, and removable with proper confirmation.

---

## Flow 12: Customer Management (CRUD)
- **Primary Route:** `/customers`
- **Backend API:** `GET/POST/PUT/DELETE /api/customers`
- **Test Steps:**
  1. Click "Add Customer".
  2. Fill form: Name "PT Alpha Solusi", CID `01.9999.1126`, SID `01.9999.1`, Service "Prime 500 Mbps", Target SLA `99.5`.
  3. Save customer: verify new customer appears in table.
  4. Edit customer: change service name or SLA; save; verify changes reflect immediately.
  5. Delete customer: confirm deletion; verify record is removed.
- **Expected Outcome:** Customer entity updates adhere to database constraints.

---

## Flow 13: Customer Excel Import & Template Download
- **Primary Route:** `/customers`
- **Backend API:** `GET /api/customers/template`, `POST /api/customers/import`
- **Test Steps:**
  1. Click "Download Template" -> downloads sample `.xlsx` template.
  2. Open "Import Excel" modal.
  3. Upload populated `.xlsx` spreadsheet.
  4. Verify preview of rows to be imported.
  5. Click "Confirm Import"; verify bulk customer insertion into database.
- **Expected Outcome:** Excel parser handles headers, data types, and duplicates gracefully.

---

## Flow 14: Network Discovery Synchronization
- **Primary Route:** `/discovery`
- **Backend API:** `POST /api/discovery/sync`, `GET /api/discovery/tree`, `POST /api/discovery/map-customer`
- **Test Steps:**
  1. Access `/discovery`.
  2. Click "Sync from Servers".
  3. System polls Cacti & PRTG monitoring trees and stores items in `DiscoveredItem` table.
  4. Search items by IP, Device Name, or Interface.
  5. Select an unmapped interface, click "Map to Customer", and bind to an existing customer record.
- **Expected Outcome:** Discovered items tree renders smoothly and mapping associates IDs correctly.

---

## Flow 15: User Management (Admin RBAC)
- **Primary Route:** `/users`
- **Backend API:** `GET/POST/PUT/DELETE /api/users`
- **Test Steps:**
  1. Log in as ADMIN. Access `/users`.
  2. Click "Create User". Fill: username `operator1`, name `Field Operator`, password `password123`, role `OPERATOR`.
  3. Save user; verify user appears in table with active status dot.
  4. Toggle user status (Active / Inactive).
  5. Log in with `operator1`; verify access to `/` and `/customers`, but access to `/users` and `/settings` is redirected/forbidden.
- **Expected Outcome:** Scrypt password hashing, session tokens, and RBAC guards function securely.

---

## Flow 16: System Configuration (Settings)
- **Primary Route:** `/settings`
- **Backend API:** `GET /api/config`, `PUT /api/config`, `POST /api/upload-template`
- **Test Steps:**
  1. Access `/settings`.
  2. Modify Document Number Prefix (e.g. `IMUN.01`), Default SLA (`99.5`), or Cacti Base URL.
  3. Click "Save Settings"; verify updated values persist in `AppConfig`.
  4. Upload new Cover / Background template PNG; verify preview updates.
- **Expected Outcome:** Settings apply globally across Generator and PDF rendering templates.

---

## Flow 17: Monitoring Connection Test
- **Primary Route:** `/settings`
- **Test Steps:**
  1. In Cacti Integration section, click "Test Connection".
  2. In PRTG Integration section, click "Test Connection".
  3. System tests network connectivity / authentication to the configured endpoints.
  4. Verify inline feedback displays connection status (Success / Error) and latency.
- **Expected Outcome:** Non-blocking connection diagnostics without unhandled exceptions.

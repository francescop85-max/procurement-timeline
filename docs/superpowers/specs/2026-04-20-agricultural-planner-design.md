# Agricultural Input Planner — Design Spec
**Date:** 2026-04-20  
**Project:** FAO Ukraine Procurement Timeline  
**Module:** Agricultural Input Planner (`/planner`)

---

## 1. Overview

A standalone planning tool for FAO Ukraine's Emergency Program team to plan agricultural input procurement backward from planting season deadlines. Users enter a target planting date per crop campaign; the system calculates the latest safe PR approval date using the existing procurement timeline engine.

The tool is deployed as a separate page at `/planner` within the same Vite project, sharing all existing timeline logic, data definitions, and Vercel infrastructure.

---

## 2. Architecture

### Integration approach
New Vite entry point within the existing `procurement_timeline` project:

```
procurement_timeline/
├── planner.html                        ← new HTML entry point
├── src/
│   ├── planner/
│   │   ├── PlannerApp.jsx              ← root component
│   │   ├── PlannerTimeline.jsx         ← top SVG timeline (adapted from GanttChart)
│   │   ├── CampaignTable.jsx           ← bottom summary/detail table
│   │   ├── CampaignPanel.jsx           ← add/edit side panel
│   │   └── useCampaigns.js             ← Vercel Blob CRUD hook
│   ├── utils.js                        ← add computeBackwardTimeline()
│   └── data.js                         ← unchanged, shared
├── api/
│   └── campaigns.js                    ← new serverless function (mirrors plans.js)
└── vite.config.js                      ← add planner entry point
```

### Shared with existing app
- `src/utils.js` — working day calculation, holiday logic, step computation (plus new backward function)
- `src/data.js` — all 9 procurement processes and 18 modifiers
- `src/hooks/useHolidays.js` — Ukraine public holidays
- `api/plans.js` pattern — `api/campaigns.js` follows identical structure
- Vercel Blob storage — campaigns stored alongside monitored plans
- `.env.local` — same `BLOB_READ_WRITE_TOKEN`

### Navigation link
The existing app's header gets a link: `🌱 Agricultural Planner →` pointing to `/planner`. The planner header has `← Procurement Timeline` pointing back.

---

## 3. Backward Planning Logic

The core new function: `computeBackwardTimeline(plantingDate, processKey, activeMods, customModifier, deliveryWeeks, holidays)`

**Algorithm:**
1. Start from `plantingDate`
2. Subtract `deliveryWeeks` (calendar days) → required delivery date (= latest PO + delivery)
3. Walk backward through the process steps in reverse order, subtracting `maxDays` per step (working days, respecting holidays)
4. The result is the latest safe PR approval date

**Constraints evaluated (all must pass):**
- `delivery date ≤ planting date`
- `PO issuance date ≤ earliest project end date` (across all funding projects)
- `delivery date ≤ earliest project end date`

**Status logic per campaign:**
- **On Track** — worst-case timeline satisfies all constraints with today before PR deadline
- **At Risk** — worst-case breaches a project end date OR today is after PR deadline but PO not yet at risk
- **Overdue** — PR deadline has passed without procurement started, or delivery cannot meet planting date

Per funding project tag: ✓ (safe) or ⚠ (at risk for PO or delivery).

---

## 4. Data Model

### Campaign (stored in Vercel Blob)

```javascript
{
  id: string,                  // uuid
  cropName: string,            // e.g. "Spring Wheat"
  plantingDate: string,        // ISO date — the hard end constraint
  estimatedValue: number,      // USD
  procurementType: string,     // "goods" | "works" | "services"
  selectedMethod: string,      // process key, auto-derived or manually overridden
  activeMods: string[],        // modifier keys from data.js
  customModifier: {            // optional user-defined step
    label: string,
    days: number
  } | null,
  deliveryWeeks: number,       // lead time from PO to delivery
  fundingProjects: [
    {
      name: string,            // free text, e.g. "USAID-2025-UA-001"
      endDate: string          // ISO date
    }
  ],
  remarks: string,             // free text notes, optional
  prDeadline: string,          // calculated (worst-case), ISO date
  poDeadline: string,          // calculated (worst-case), ISO date
  deliveryDeadline: string,    // calculated (worst-case), ISO date
  createdAt: string,
  updatedAt: string
}
```

### Blob storage key
`campaigns.json` — array of campaign objects, same pattern as `plans.json`.

---

## 5. Page Layout

### Overall structure
Stacked layout, full-width sections:

```
┌─────────────────────────────────────────────┐
│  Header bar (dark green, link back)          │
├─────────────────────────────────────────────┤
│  Agricultural Calendar Timeline (top)        │
│  - Dynamic date range: earliest PR → latest  │
│    planting across all active campaigns      │
│  - One row per campaign                      │
│  - Project end date markers (dashed lines)   │
├─────────────────────────────────────────────┤
│  Campaigns Table (bottom)                    │
│  - Summary view (default)                    │
│  - Detail view when a campaign is selected   │
└─────────────────────────────────────────────┘
```

---

## 6. Timeline Component (`PlannerTimeline.jsx`)

Adapted from the existing `GanttChart.jsx` with the following changes:

### Overview mode (all campaigns)
- Each row shows:
  - **Left label**: crop name (bold) + `[start date] → [planting date]` subtitle + funding project codes
  - **Bars**: procurement steps (solid, coloured by status) + delivery window (faded)
  - **Planting marker**: vertical coloured bar at planting date
- **Project end date markers**: dashed vertical lines spanning full chart height, one per unique project end date, colour-coded and labelled at the bottom
- **Today marker**: blue dashed vertical line (existing pattern)
- **Row colours**: green (On Track), amber (At Risk), red (Overdue)
- Clicking a row switches to detail view

### Detail mode (single campaign)
- Header shows: `← All Campaigns` · crop name · `[PR deadline] → [planting date]` · status pill
- Individual step bars visible (one row per step)
- Planting marker with 🌱 label
- Project end date markers still shown
- Today marker still shown

### Legend
Procurement steps | Delivery | Planting date | Project end date | Today

---

## 7. Campaign Table (`CampaignTable.jsx`)

### Summary view columns
| Crop / Input | Start (PR by) | End (Planting) | Value (USD) | Method | Funding Projects | Status | Actions |

- **Funding Projects**: colour-coded tags per project, each showing ✓ or ⚠
- **Remarks**: shown as a faint italic preview (truncated to ~40 chars) below the crop name if present
- **Actions**: ▶ Details · ✎ Edit · ✕ Delete

### Detail view
Replaces summary table for the selected campaign. Columns: # · Step · Owner · Days · Earliest · Latest

Final rows:
- 🚚 Delivery Period (faint green background)
- 🌱 Planting Date (green background, bold — the anchor)

Edit and Delete buttons in the section header. `← All Campaigns` link returns to summary.

---

## 8. Campaign Side Panel (`CampaignPanel.jsx`)

Slides in from the right (same pattern as existing app sidebar). Used for both Add and Edit. Fields in order:

1. **Crop / Input Type** — text input
2. **Target Planting Date** — date input
3. **Estimated Value (USD)** — number input
4. **Delivery Lead Time** — number input + "weeks" label
5. **Funding Projects** — repeatable block (+ Add another project / ✕ Remove):
   - Project name / code (text)
   - Project end date (date)
6. **Procurement Method** — auto-recommended from value/type (same SmartSelector logic), with "Override method ↓" toggle to show full method selector
7. **Additional Circumstances** — collapsed list of all 18 modifiers from `data.js` (first 2–3 shown, rest behind "+ show all modifiers")
8. **Custom Step** — optional label (text) + number of days; injected into the step sequence before the final award/PO step
9. **Remarks / Notes** — textarea, free text
10. **Calculated Deadlines box** (live, updates as fields change):
    - PR must be raised by: `[date]`
    - PO must be issued by: `[date]`
    - Delivery by (planting): `[date]`
    - Per funding project: name · ends `[date]` · ✓ or ⚠
11. **Add Campaign / Save Changes** button

---

## 9. Data Persistence (`useCampaigns.js` + `api/campaigns.js`)

`api/campaigns.js` — Vercel serverless function, identical pattern to `api/plans.js`:
- `GET` — returns full campaigns array from Blob
- `POST` — upserts a campaign by `id`
- `DELETE` — removes a campaign by `id`

`useCampaigns.js` — custom hook:
- Fetches on mount
- Exposes `campaigns`, `saveCampaign(campaign)`, `deleteCampaign(id)`, `loading`, `error`
- Campaigns are shared across all team members (public Blob, same as monitored plans)

---

## 10. New Utility Function (`utils.js`)

```javascript
// Returns { prDeadline, poDeadline, deliveryDeadline, steps }
// steps: array with earliest/latest dates computed backward from plantingDate
computeBackwardTimeline(plantingDate, processKey, activeMods, customModifier, deliveryWeeks, holidays)
```

Custom modifier (if present) is inserted as an additional step before the final contract/PO step, with `minDays = maxDays = customModifier.days` (working days).

---

## 11. Vite Config Change

Add `planner` as a second build entry in `vite.config.js`:

```javascript
build: {
  rollupOptions: {
    input: {
      main: 'index.html',
      planner: 'planner.html'
    }
  }
}
```

---

## 12. Styling

- Header: dark green (`#1a3a2a`) matching FAO Ukraine branding
- Timeline background: `#f0f5f0` (lighter green tint, distinct from main app)
- Status colours: existing green/amber/red palette
- Project end date markers: colour-coded per project (cycling through a fixed palette)
- Side panel: same pattern as existing app sidebar (white, border-left)
- Fonts and CSS variables: shared from `src/index.css`

---

## 13. Out of Scope

- Monitoring/actuals tracking per campaign step (not needed — this is a planning tool only)
- Shareable URL hash per campaign (Blob is the single source of truth)
- Print/PDF export (can be added later)
- Year/season selector (dynamic date range handles this automatically)

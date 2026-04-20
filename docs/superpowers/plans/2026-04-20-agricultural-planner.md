# Agricultural Input Planner — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a `/planner` page that lets FAO Ukraine's Emergency Program team plan agricultural input procurement backward from planting season deadlines, managing multiple concurrent campaigns with funding project constraints.

**Architecture:** New Vite entry point (`planner.html` + `src/planner/`) within the existing project, sharing `utils.js`, `data.js`, and the Ukraine holidays hook. Campaigns are persisted to Vercel Blob via a new `api/campaigns.js` serverless function mirroring the existing `api/plans.js`. Core new logic is `computeBackwardTimeline()` added to `utils.js`.

**Tech Stack:** React 19, Vite 8, Vercel Blob, Vitest + jsdom for testing, existing `src/utils.js` / `src/data.js` / `src/hooks/useHolidays.js`

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `vite.config.js` | Add planner entry point + Vitest config |
| Modify | `package.json` | Add test script + vitest devDependencies |
| Create | `src/test-setup.js` | Vitest global setup (jest-dom matchers) |
| Modify | `src/utils.js` | Add `computeBackwardTimeline`, `computeCampaignStatus`, `computeProjectStatuses` |
| Create | `src/utils.planner.test.js` | Tests for the three new utility functions |
| Create | `api/campaigns.js` | Serverless CRUD for campaigns (mirrors `api/plans.js`) |
| Create | `src/planner/useCampaigns.js` | Hook: fetch / save / delete via `/api/campaigns` |
| Create | `src/planner/useCampaigns.test.js` | Tests for hook with mocked fetch |
| Create | `planner.html` | HTML entry point that mounts PlannerApp |
| Create | `src/planner/planner-main.jsx` | React DOM root mount for planner |
| Create | `src/planner/PlannerApp.jsx` | Root: state, layout shell, panel/table/timeline orchestration |
| Create | `src/planner/CampaignPanel.jsx` | Add/edit side panel (all fields + live calculation) |
| Create | `src/planner/CampaignTable.jsx` | Summary table + detail step breakdown |
| Create | `src/planner/PlannerTimeline.jsx` | SVG Gantt timeline (adapted from GanttChart.jsx) |
| Create | `src/planner/planner.css` | Planner-specific styles |
| Modify | `src/App.jsx` | Add 🌱 Agricultural Planner link in header |

---

## Task 1: Set up Vitest

**Files:**
- Modify: `vite.config.js`
- Modify: `package.json`
- Create: `src/test-setup.js`

- [ ] **Step 1: Install test dependencies**

```bash
cd /Users/francesco/Desktop/claude_code_test/procurement_timeline
npm install --save-dev vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

Expected: packages added to `devDependencies` in `package.json`.

- [ ] **Step 2: Update `vite.config.js`** to add Vitest config and planner entry point

```js
// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.js'],
  },
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        planner: 'planner.html',
      },
    },
  },
})
```

- [ ] **Step 3: Add test script to `package.json`**

Add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Create `src/test-setup.js`**

```js
// src/test-setup.js
import '@testing-library/jest-dom';
```

- [ ] **Step 5: Verify setup works**

```bash
npx vitest run --reporter=verbose 2>&1 | head -20
```

Expected: `No test files found` or similar — no crash, Vitest is configured correctly.

- [ ] **Step 6: Commit**

```bash
git add vite.config.js package.json package-lock.json src/test-setup.js
git commit -m "chore: set up Vitest with jsdom and testing-library"
```

---

## Task 2: `computeBackwardTimeline` + status helpers in `utils.js`

**Files:**
- Modify: `src/utils.js`
- Create: `src/utils.planner.test.js`

- [ ] **Step 1: Write the failing tests**

Create `src/utils.planner.test.js`:

```js
import { describe, it, expect } from 'vitest';
import {
  computeBackwardTimeline,
  computeCampaignStatus,
  computeProjectStatuses,
} from './utils.js';
import { PROCESSES, MODIFIERS } from './data.js';

const NO_HOLIDAYS = new Set();

// A simple 2-step process for testing (no calendar days, pure working days)
// rfq has 7 steps with min 14 / max 18 working days total
// We use 'rfq' (USD 5k–25k): 7 steps, maxDays sum = 3+1+6+4+3+3+2 = 22 working days

describe('computeBackwardTimeline', () => {
  it('returns prDeadline earlier than plantingDate', () => {
    const result = computeBackwardTimeline(
      '2025-05-01',
      'rfq',
      [],
      null,
      2,
      NO_HOLIDAYS,
      PROCESSES,
      MODIFIERS,
    );
    expect(new Date(result.prDeadline) < new Date('2025-05-01')).toBe(true);
  });

  it('poDeadline is deliveryWeeks * 7 calendar days before plantingDate', () => {
    const result = computeBackwardTimeline(
      '2025-05-01',
      'rfq',
      [],
      null,
      2,
      NO_HOLIDAYS,
      PROCESSES,
      MODIFIERS,
    );
    const expectedPo = new Date('2025-05-01');
    expectedPo.setDate(expectedPo.getDate() - 14);
    expect(result.poDeadline).toBe(expectedPo.toLocaleDateString('sv'));
  });

  it('deliveryDeadline equals plantingDate', () => {
    const result = computeBackwardTimeline(
      '2025-05-01',
      'rfq',
      [],
      null,
      3,
      NO_HOLIDAYS,
      PROCESSES,
      MODIFIERS,
    );
    expect(result.deliveryDeadline).toBe('2025-05-01');
  });

  it('returns steps array with same length as process steps', () => {
    const result = computeBackwardTimeline(
      '2025-05-01',
      'rfq',
      [],
      null,
      2,
      NO_HOLIDAYS,
      PROCESSES,
      MODIFIERS,
    );
    expect(result.steps).toHaveLength(PROCESSES.rfq.steps.length);
  });

  it('injects custom modifier step before last step', () => {
    const result = computeBackwardTimeline(
      '2025-05-01',
      'rfq',
      [],
      { label: 'Beneficiary check', days: 5 },
      2,
      NO_HOLIDAYS,
      PROCESSES,
      MODIFIERS,
    );
    expect(result.steps).toHaveLength(PROCESSES.rfq.steps.length + 1);
    const customStep = result.steps[result.steps.length - 2];
    expect(customStep.name).toBe('Beneficiary check');
    expect(customStep.maxDays).toBe(5);
  });

  it('earlier plantingDate produces earlier prDeadline', () => {
    const r1 = computeBackwardTimeline('2025-04-01', 'rfq', [], null, 2, NO_HOLIDAYS, PROCESSES, MODIFIERS);
    const r2 = computeBackwardTimeline('2025-05-01', 'rfq', [], null, 2, NO_HOLIDAYS, PROCESSES, MODIFIERS);
    expect(new Date(r1.prDeadline) < new Date(r2.prDeadline)).toBe(true);
  });

  it('zero deliveryWeeks: poDeadline equals plantingDate', () => {
    const result = computeBackwardTimeline(
      '2025-05-01',
      'rfq',
      [],
      null,
      0,
      NO_HOLIDAYS,
      PROCESSES,
      MODIFIERS,
    );
    expect(result.poDeadline).toBe('2025-05-01');
  });
});

describe('computeCampaignStatus', () => {
  const futurePR = '2099-01-01';
  const pastPR = '2000-01-01';
  const futurePO = '2099-02-01';
  const pastPO = '2000-02-01';
  const futureDelivery = '2099-03-01';

  it('returns on_track when today before prDeadline and no project constraints', () => {
    const campaign = {
      prDeadline: futurePR,
      poDeadline: futurePO,
      deliveryDeadline: futureDelivery,
      fundingProjects: [],
    };
    expect(computeCampaignStatus(campaign, new Date('2025-01-01'))).toBe('on_track');
  });

  it('returns at_risk when today is after prDeadline', () => {
    const campaign = {
      prDeadline: pastPR,
      poDeadline: futurePO,
      deliveryDeadline: futureDelivery,
      fundingProjects: [],
    };
    expect(computeCampaignStatus(campaign, new Date('2025-01-01'))).toBe('at_risk');
  });

  it('returns at_risk when poDeadline exceeds a project end date', () => {
    const campaign = {
      prDeadline: futurePR,
      poDeadline: '2025-06-01',
      deliveryDeadline: '2025-07-01',
      fundingProjects: [{ name: 'EU-2025', endDate: '2025-04-30' }],
    };
    expect(computeCampaignStatus(campaign, new Date('2025-01-01'))).toBe('at_risk');
  });

  it('returns overdue when deliveryDeadline exceeds a project end date', () => {
    const campaign = {
      prDeadline: futurePR,
      poDeadline: '2025-03-01',
      deliveryDeadline: '2025-06-01',
      fundingProjects: [{ name: 'EU-2025', endDate: '2025-04-30' }],
    };
    expect(computeCampaignStatus(campaign, new Date('2025-01-01'))).toBe('overdue');
  });

  it('ignores projects without endDate', () => {
    const campaign = {
      prDeadline: futurePR,
      poDeadline: futurePO,
      deliveryDeadline: futureDelivery,
      fundingProjects: [{ name: 'TBD', endDate: '' }],
    };
    expect(computeCampaignStatus(campaign, new Date('2025-01-01'))).toBe('on_track');
  });
});

describe('computeProjectStatuses', () => {
  it('marks project ok when PO and delivery are before end date', () => {
    const campaign = {
      poDeadline: '2025-03-01',
      deliveryDeadline: '2025-04-01',
      fundingProjects: [{ name: 'USAID', endDate: '2025-12-31' }],
    };
    const result = computeProjectStatuses(campaign);
    expect(result[0].status).toBe('ok');
  });

  it('marks project at_risk when PO exceeds end date', () => {
    const campaign = {
      poDeadline: '2025-06-01',
      deliveryDeadline: '2025-07-01',
      fundingProjects: [{ name: 'EU', endDate: '2025-04-30' }],
    };
    const result = computeProjectStatuses(campaign);
    expect(result[0].status).toBe('at_risk');
  });

  it('returns empty array for no funding projects', () => {
    const campaign = { poDeadline: '2025-03-01', deliveryDeadline: '2025-04-01', fundingProjects: [] };
    expect(computeProjectStatuses(campaign)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run src/utils.planner.test.js 2>&1 | tail -20
```

Expected: FAIL — `computeBackwardTimeline is not a function` (or similar)

- [ ] **Step 3: Add the three functions to `src/utils.js`**

Append to the bottom of `src/utils.js`:

```js
/**
 * Compute a backward procurement timeline from a target planting date.
 * Returns prDeadline, poDeadline, deliveryDeadline (all ISO strings) and
 * a forward-computed steps array for display.
 */
export function computeBackwardTimeline(
  plantingDate,
  processKey,
  activeMods,
  customModifier,
  deliveryWeeks,
  holidays = new Set(),
  PROCESSES,
  MODIFIERS,
) {
  const steps = buildSteps(processKey, activeMods, PROCESSES, MODIFIERS);

  if (customModifier && customModifier.label && customModifier.days > 0) {
    steps.splice(steps.length - 1, 0, {
      name: customModifier.label,
      owner: 'Custom',
      minDays: customModifier.days,
      maxDays: customModifier.days,
    });
  }

  // Walk backward from plantingDate
  let cursor = new Date(plantingDate);

  // Subtract delivery period (calendar days) → poDeadline
  cursor.setDate(cursor.getDate() - (deliveryWeeks || 0) * 7);
  const poDeadline = new Date(cursor);

  // Walk backward through steps in reverse using maxDays
  for (let i = steps.length - 1; i >= 0; i--) {
    const step = steps[i];
    if (step.calendarDays) {
      cursor.setDate(cursor.getDate() - step.maxDays);
    } else {
      cursor = subtractWorkingDays(cursor, step.maxDays, holidays);
    }
  }

  const prDeadline = new Date(cursor);

  return {
    prDeadline: toISO(prDeadline),
    poDeadline: toISO(poDeadline),
    deliveryDeadline: toISO(new Date(plantingDate)),
    steps: computeTimeline(steps, prDeadline, holidays),
  };
}

/**
 * Derive the overall status of a campaign.
 * 'overdue'  — delivery exceeds a project end date
 * 'at_risk'  — PO exceeds a project end date, OR today is past the PR deadline
 * 'on_track' — all constraints satisfied and PR deadline is in the future
 */
export function computeCampaignStatus(campaign, today = new Date()) {
  const poDeadline = new Date(campaign.poDeadline);
  const deliveryDeadline = new Date(campaign.deliveryDeadline);
  const prDeadline = new Date(campaign.prDeadline);

  const projectEnds = (campaign.fundingProjects || [])
    .filter(p => p.endDate)
    .map(p => new Date(p.endDate));

  if (projectEnds.some(end => deliveryDeadline > end)) return 'overdue';
  if (projectEnds.some(end => poDeadline > end) || today > prDeadline) return 'at_risk';
  return 'on_track';
}

/**
 * Returns fundingProjects annotated with status: 'ok' | 'at_risk'
 */
export function computeProjectStatuses(campaign) {
  const poDeadline = new Date(campaign.poDeadline);
  const deliveryDeadline = new Date(campaign.deliveryDeadline);
  return (campaign.fundingProjects || []).map(p => {
    if (!p.endDate) return { ...p, status: 'ok' };
    const end = new Date(p.endDate);
    return { ...p, status: poDeadline > end || deliveryDeadline > end ? 'at_risk' : 'ok' };
  });
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run src/utils.planner.test.js --reporter=verbose 2>&1
```

Expected: all 16 tests pass, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add src/utils.js src/utils.planner.test.js
git commit -m "feat: add computeBackwardTimeline and campaign status helpers"
```

---

## Task 3: `api/campaigns.js` serverless function

**Files:**
- Create: `api/campaigns.js`

- [ ] **Step 1: Create `api/campaigns.js`** (mirrors `api/plans.js` exactly, different blob key and field names)

```js
// api/campaigns.js
import { put, head } from "@vercel/blob";

const BLOB_PATH = "campaigns.json";

async function readCampaigns() {
  try {
    const meta = await head(BLOB_PATH, { token: process.env.BLOB_READ_WRITE_TOKEN }).catch(() => null);
    if (!meta) return [];
    const res = await fetch(meta.url);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

async function writeCampaigns(campaigns) {
  await put(BLOB_PATH, JSON.stringify(campaigns), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "GET") {
    return res.status(200).json(await readCampaigns());
  }

  if (req.method === "POST") {
    const campaign = req.body;
    if (!campaign || !campaign.id) return res.status(400).json({ error: "Missing id" });
    const campaigns = await readCampaigns();
    const next = [campaign, ...campaigns.filter(c => c.id !== campaign.id)];
    await writeCampaigns(next);
    return res.status(200).json({ ok: true });
  }

  if (req.method === "DELETE") {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "Missing id" });
    await writeCampaigns((await readCampaigns()).filter(c => c.id !== id));
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
```

- [ ] **Step 2: Commit**

```bash
git add api/campaigns.js
git commit -m "feat: add campaigns serverless API endpoint"
```

---

## Task 4: `useCampaigns.js` hook

**Files:**
- Create: `src/planner/useCampaigns.js`
- Create: `src/planner/useCampaigns.test.js`

- [ ] **Step 1: Write the failing tests**

Create `src/planner/useCampaigns.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCampaigns } from './useCampaigns.js';

const mockCampaign = {
  id: 'abc123',
  cropName: 'Spring Wheat',
  plantingDate: '2025-05-01',
  prDeadline: '2025-01-10',
  poDeadline: '2025-03-26',
  deliveryDeadline: '2025-05-01',
  fundingProjects: [],
  remarks: '',
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('useCampaigns', () => {
  it('fetches campaigns on mount', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [mockCampaign],
    }));

    const { result } = renderHook(() => useCampaigns());

    await act(async () => {});

    expect(result.current.campaigns).toEqual([mockCampaign]);
    expect(result.current.loading).toBe(false);
  });

  it('sets loading true while fetching', async () => {
    let resolve;
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(r => { resolve = r; })));

    const { result } = renderHook(() => useCampaigns());
    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolve({ ok: true, json: async () => [] });
    });
    expect(result.current.loading).toBe(false);
  });

  it('saveCampaign POSTs and updates local state', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });

    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useCampaigns());
    await act(async () => {});

    await act(async () => {
      await result.current.saveCampaign(mockCampaign);
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/campaigns', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify(mockCampaign),
    }));
    expect(result.current.campaigns).toContainEqual(mockCampaign);
  });

  it('deleteCampaign DELETEs and removes from local state', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => [mockCampaign] })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });

    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useCampaigns());
    await act(async () => {});

    await act(async () => {
      await result.current.deleteCampaign('abc123');
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/campaigns?id=abc123', expect.objectContaining({
      method: 'DELETE',
    }));
    expect(result.current.campaigns).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run src/planner/useCampaigns.test.js 2>&1 | tail -10
```

Expected: FAIL — `useCampaigns is not a function`

- [ ] **Step 3: Create `src/planner/useCampaigns.js`**

```js
// src/planner/useCampaigns.js
import { useState, useEffect } from 'react';

export function useCampaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/campaigns')
      .then(r => r.json())
      .then(setCampaigns)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function saveCampaign(campaign) {
    await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(campaign),
    });
    setCampaigns(prev => [campaign, ...prev.filter(c => c.id !== campaign.id)]);
  }

  async function deleteCampaign(id) {
    await fetch(`/api/campaigns?id=${id}`, { method: 'DELETE' });
    setCampaigns(prev => prev.filter(c => c.id !== id));
  }

  return { campaigns, loading, error, saveCampaign, deleteCampaign };
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run src/planner/useCampaigns.test.js --reporter=verbose 2>&1
```

Expected: all 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/planner/useCampaigns.js src/planner/useCampaigns.test.js
git commit -m "feat: add useCampaigns hook with Blob persistence"
```

---

## Task 5: Entry point — `planner.html` + `src/planner/planner-main.jsx`

**Files:**
- Create: `planner.html`
- Create: `src/planner/planner-main.jsx`
- Create: `src/planner/planner.css`

- [ ] **Step 1: Create `planner.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>FAO Ukraine — Agricultural Input Planner</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/planner/planner-main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Create `src/planner/planner-main.jsx`**

```jsx
// src/planner/planner-main.jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import './planner.css';
import PlannerApp from './PlannerApp.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PlannerApp />
  </StrictMode>
);
```

- [ ] **Step 3: Create `src/planner/planner.css`**

```css
/* src/planner/planner.css */

.planner-header {
  background: #1a3a2a;
  color: #fff;
  padding: 10px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.planner-header-title {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.3px;
}

.planner-header-back {
  margin-left: auto;
  font-size: 11px;
  opacity: 0.65;
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 3px 10px;
  border-radius: 3px;
  text-decoration: none;
  color: #fff;
  cursor: pointer;
}

.planner-header-back:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.1);
}

.planner-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.planner-timeline-section {
  background: #f0f5f0;
  border-bottom: 2px solid #c8dcc8;
  padding: 14px 20px;
  flex-shrink: 0;
  overflow-x: auto;
}

.planner-timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.planner-timeline-title {
  font-size: 10px;
  font-weight: 700;
  color: #2e5e2e;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.planner-table-section {
  flex: 1;
  overflow-y: auto;
  padding: 14px 20px;
}

.planner-table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.planner-table-title {
  font-size: 10px;
  font-weight: 700;
  color: #444;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.planner-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.planner-table th {
  text-align: left;
  padding: 6px 10px;
  border-bottom: 2px solid #ddd;
  font-size: 10px;
  font-weight: 600;
  color: #555;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

.planner-table td {
  padding: 7px 10px;
  border-bottom: 1px solid #f0f0f0;
  vertical-align: middle;
}

.planner-table tr:hover td {
  background: #fafafa;
}

.planner-table tr.selected td {
  background: #f0f7ff;
}

.campaign-name {
  font-weight: 600;
}

.campaign-remarks-preview {
  font-size: 10px;
  color: #999;
  font-style: italic;
  margin-top: 2px;
}

.status-pill {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 600;
  white-space: nowrap;
}

.status-pill.on_track { background: #e8f5e9; color: #2e7d32; }
.status-pill.at_risk  { background: #fff8e1; color: #f57c00; }
.status-pill.overdue  { background: #ffebee; color: #c62828; }

.method-tag {
  display: inline-block;
  background: #e3f2fd;
  color: #1565c0;
  padding: 2px 7px;
  border-radius: 3px;
  font-size: 10px;
  white-space: nowrap;
}

.project-tag {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 10px;
  margin-right: 3px;
  white-space: nowrap;
}

.project-tag.ok       { background: #f3e5f5; color: #6a1b9a; }
.project-tag.at_risk  { background: #fff3e0; color: #e65100; }

.date-ok      { color: #2e7d32; font-weight: 700; }
.date-at-risk { color: #f57c00; font-weight: 700; }
.date-overdue { color: #c62828; font-weight: 700; }

.action-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 6px;
  font-size: 11px;
  border-radius: 3px;
}

.action-btn:hover { background: #f0f0f0; }
.action-btn.details { color: #1565c0; }
.action-btn.edit    { color: #555; }
.action-btn.delete  { color: #c62828; }

/* Side panel */
.planner-panel-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.2);
  z-index: 100;
}

.planner-panel {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 300px;
  background: #fff;
  border-left: 2px solid #1a3a2a;
  z-index: 101;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 16px;
  box-shadow: -4px 0 20px rgba(0,0,0,0.15);
}

.planner-panel-title {
  font-size: 13px;
  font-weight: 700;
  color: #1a3a2a;
  margin-bottom: 14px;
}

.panel-field {
  margin-bottom: 12px;
}

.panel-label {
  font-size: 10px;
  font-weight: 600;
  color: #555;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.panel-input {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 12px;
  font-family: var(--font-sans);
  box-sizing: border-box;
}

.panel-input:focus {
  outline: none;
  border-color: #1a3a2a;
}

.project-block {
  background: #f9f9f9;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 8px;
  margin-bottom: 6px;
}

.add-project-btn {
  font-size: 11px;
  color: #1565c0;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}

.add-project-btn:hover { text-decoration: underline; }

.deadline-box {
  background: #f0f7ff;
  border-left: 3px solid #1565c0;
  border-radius: 4px;
  padding: 10px;
  margin-bottom: 12px;
  font-size: 11px;
}

.deadline-box-title {
  font-weight: 700;
  color: #1565c0;
  font-size: 12px;
  margin-bottom: 6px;
}

.deadline-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 3px;
}

.deadline-row span:first-child { color: #666; }
.deadline-row span:last-child  { font-weight: 700; color: #1a3a2a; }

.deadline-projects {
  border-top: 1px solid #c5dff8;
  margin-top: 6px;
  padding-top: 6px;
}

.panel-save-btn {
  width: 100%;
  background: #1a3a2a;
  color: #fff;
  border: none;
  padding: 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  font-family: var(--font-sans);
  margin-top: 4px;
}

.panel-save-btn:hover { background: #2a5a3a; }

.modifiers-toggle {
  font-size: 11px;
  color: #1565c0;
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 0;
}

.method-recommendation {
  background: #e8f5e9;
  border: 1px solid #a5d6a7;
  border-radius: 4px;
  padding: 7px 9px;
  font-size: 11px;
  color: #2e7d32;
}

.method-override-btn {
  font-size: 10px;
  color: #1565c0;
  background: none;
  border: none;
  cursor: pointer;
  padding: 3px 0 0;
}

.detail-back-btn {
  font-size: 11px;
  color: #1565c0;
  background: none;
  border: none;
  cursor: pointer;
  font-weight: 600;
  padding: 0;
  margin-right: 12px;
}

.detail-back-btn:hover { text-decoration: underline; }

.step-table th, .step-table td {
  padding: 5px 8px;
  font-size: 11px;
}

.step-delivery-row td { background: #f1f8e9; color: #388e3c; }
.step-planting-row td { background: #e8f5e9; font-weight: 700; color: #1a3a2a; border-top: 2px solid #a5d6a7; }
```

- [ ] **Step 4: Verify dev server starts without error**

```bash
npx vite --port 5175 2>&1 &
sleep 3 && curl -s http://localhost:5175/planner | head -5
```

Expected: HTML from `planner.html` (DOCTYPE line visible). Kill the dev server after checking: `kill %1`

- [ ] **Step 5: Commit**

```bash
git add planner.html src/planner/planner-main.jsx src/planner/planner.css
git commit -m "feat: add planner entry point and CSS"
```

---

## Task 6: `PlannerApp.jsx` — root component and layout shell

**Files:**
- Create: `src/planner/PlannerApp.jsx`

- [ ] **Step 1: Create `src/planner/PlannerApp.jsx`**

This is the orchestrator. It manages state and renders the three child components plus the panel overlay. The campaign's `id` is a UUID generated at save time using `crypto.randomUUID()`.

```jsx
// src/planner/PlannerApp.jsx
import { useState } from 'react';
import { useHolidays } from '../hooks/useHolidays.js';
import { useCampaigns } from './useCampaigns.js';
import { PROCESSES, MODIFIERS } from '../data.js';
import { computeBackwardTimeline, computeCampaignStatus, computeProjectStatuses } from '../utils.js';
import PlannerTimeline from './PlannerTimeline.jsx';
import CampaignTable from './CampaignTable.jsx';
import CampaignPanel from './CampaignPanel.jsx';

export default function PlannerApp() {
  const { holidays } = useHolidays();
  const { campaigns, saveCampaign, deleteCampaign } = useCampaigns();

  // null = overview; string id = detail view for that campaign
  const [selectedId, setSelectedId] = useState(null);
  // null = panel closed; 'add' = new; campaign object = edit mode
  const [panelMode, setPanelMode] = useState(null);

  const selectedCampaign = selectedId ? campaigns.find(c => c.id === selectedId) : null;

  function handleAddClick() {
    setPanelMode('add');
  }

  function handleEditClick(campaign) {
    setPanelMode(campaign);
  }

  async function handleDeleteClick(id) {
    if (!window.confirm('Remove this campaign?')) return;
    await deleteCampaign(id);
    if (selectedId === id) setSelectedId(null);
  }

  async function handlePanelSave(formData) {
    const timeline = computeBackwardTimeline(
      formData.plantingDate,
      formData.selectedMethod,
      formData.activeMods,
      formData.customModifier,
      formData.deliveryWeeks,
      holidays,
      PROCESSES,
      MODIFIERS,
    );

    const campaign = {
      id: formData.id || crypto.randomUUID(),
      cropName: formData.cropName,
      plantingDate: formData.plantingDate,
      estimatedValue: formData.estimatedValue,
      procurementType: formData.procurementType,
      selectedMethod: formData.selectedMethod,
      activeMods: formData.activeMods,
      customModifier: formData.customModifier,
      deliveryWeeks: formData.deliveryWeeks,
      fundingProjects: formData.fundingProjects,
      remarks: formData.remarks,
      prDeadline: timeline.prDeadline,
      poDeadline: timeline.poDeadline,
      deliveryDeadline: timeline.deliveryDeadline,
      steps: timeline.steps,
      createdAt: formData.id ? (campaigns.find(c => c.id === formData.id)?.createdAt ?? new Date().toISOString()) : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveCampaign(campaign);
    setPanelMode(null);
  }

  const enriched = campaigns.map(c => ({
    ...c,
    status: computeCampaignStatus(c),
    projectStatuses: computeProjectStatuses(c),
  }));

  return (
    <div className="planner-layout">
      {/* Header */}
      <div className="planner-header">
        <span style={{ fontSize: 18 }}>🌱</span>
        <span className="planner-header-title">FAO Ukraine — Agricultural Input Planner</span>
        <a href="/" className="planner-header-back">← Procurement Timeline</a>
      </div>

      {/* Timeline */}
      <PlannerTimeline
        campaigns={enriched}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />

      {/* Table */}
      <CampaignTable
        campaigns={enriched}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onEdit={handleEditClick}
        onDelete={handleDeleteClick}
        onAdd={handleAddClick}
      />

      {/* Side panel */}
      {panelMode !== null && (
        <>
          <div className="planner-panel-overlay" onClick={() => setPanelMode(null)} />
          <CampaignPanel
            campaign={panelMode === 'add' ? null : panelMode}
            holidays={holidays}
            onSave={handlePanelSave}
            onClose={() => setPanelMode(null)}
          />
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/planner/PlannerApp.jsx
git commit -m "feat: add PlannerApp root component and layout orchestration"
```

---

## Task 7: `CampaignPanel.jsx` — add/edit side panel

**Files:**
- Create: `src/planner/CampaignPanel.jsx`

- [ ] **Step 1: Create `src/planner/CampaignPanel.jsx`**

```jsx
// src/planner/CampaignPanel.jsx
import { useState, useEffect } from 'react';
import { PROCESSES, MODIFIERS } from '../data.js';
import { computeBackwardTimeline, computeProjectStatuses, formatDate } from '../utils.js';
import { useHolidays } from '../hooks/useHolidays.js';

function recommendMethod(value, type) {
  if (!value || !type) return null;
  const v = Number(value);
  if (type === 'works') {
    if (v < 1000) return 'very_low';
    if (v < 5000) return 'micro';
    if (v < 25000) return 'rfq';
    return 'itb_works';
  }
  if (v < 1000) return 'very_low';
  if (v < 5000) return 'micro';
  if (v < 25000) return 'rfq';
  return 'itb';
}

const EMPTY_FORM = {
  cropName: '',
  plantingDate: '',
  estimatedValue: '',
  procurementType: 'goods',
  selectedMethod: '',
  activeMods: [],
  customModifier: { label: '', days: '' },
  deliveryWeeks: 2,
  fundingProjects: [],
  remarks: '',
};

export default function CampaignPanel({ campaign, onSave, onClose }) {
  const { holidays } = useHolidays();
  const [form, setForm] = useState(EMPTY_FORM);
  const [showAllMods, setShowAllMods] = useState(false);
  const [overrideMethod, setOverrideMethod] = useState(false);
  const [computed, setComputed] = useState(null);

  useEffect(() => {
    if (campaign) {
      setForm({
        cropName: campaign.cropName || '',
        plantingDate: campaign.plantingDate || '',
        estimatedValue: campaign.estimatedValue || '',
        procurementType: campaign.procurementType || 'goods',
        selectedMethod: campaign.selectedMethod || '',
        activeMods: campaign.activeMods || [],
        customModifier: campaign.customModifier || { label: '', days: '' },
        deliveryWeeks: campaign.deliveryWeeks ?? 2,
        fundingProjects: campaign.fundingProjects || [],
        remarks: campaign.remarks || '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [campaign]);

  // Recalculate deadlines whenever key fields change
  useEffect(() => {
    const method = overrideMethod ? form.selectedMethod : (recommendMethod(form.estimatedValue, form.procurementType) || form.selectedMethod);
    if (!form.plantingDate || !method || !PROCESSES[method]) {
      setComputed(null);
      return;
    }
    const customMod = form.customModifier.label && form.customModifier.days > 0
      ? { label: form.customModifier.label, days: Number(form.customModifier.days) }
      : null;
    try {
      const result = computeBackwardTimeline(
        form.plantingDate,
        method,
        form.activeMods,
        customMod,
        Number(form.deliveryWeeks) || 0,
        holidays,
        PROCESSES,
        MODIFIERS,
      );
      setComputed({ ...result, method });
    } catch {
      setComputed(null);
    }
  }, [form.plantingDate, form.estimatedValue, form.procurementType, form.selectedMethod,
      form.activeMods, form.customModifier, form.deliveryWeeks, overrideMethod, holidays]);

  function set(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function toggleMod(key) {
    setForm(prev => ({
      ...prev,
      activeMods: prev.activeMods.includes(key)
        ? prev.activeMods.filter(k => k !== key)
        : [...prev.activeMods, key],
    }));
  }

  function addProject() {
    set('fundingProjects', [...form.fundingProjects, { name: '', endDate: '' }]);
  }

  function updateProject(i, field, value) {
    const updated = form.fundingProjects.map((p, idx) => idx === i ? { ...p, [field]: value } : p);
    set('fundingProjects', updated);
  }

  function removeProject(i) {
    set('fundingProjects', form.fundingProjects.filter((_, idx) => idx !== i));
  }

  function handleSave() {
    const method = overrideMethod ? form.selectedMethod : (recommendMethod(form.estimatedValue, form.procurementType) || form.selectedMethod);
    if (!form.cropName || !form.plantingDate || !method) return;
    const customMod = form.customModifier.label && form.customModifier.days > 0
      ? { label: form.customModifier.label, days: Number(form.customModifier.days) }
      : null;
    onSave({
      id: campaign?.id,
      ...form,
      selectedMethod: method,
      customModifier: customMod,
      estimatedValue: Number(form.estimatedValue) || 0,
      deliveryWeeks: Number(form.deliveryWeeks) || 0,
    });
  }

  const recommended = recommendMethod(form.estimatedValue, form.procurementType);
  const activeMethod = overrideMethod ? form.selectedMethod : recommended;

  const applicableMods = MODIFIERS.filter(m => !activeMethod || m.applicable.includes(activeMethod));
  const visibleMods = showAllMods ? applicableMods : applicableMods.slice(0, 3);

  const projectStatusPreview = computed
    ? computeProjectStatuses({
        poDeadline: computed.poDeadline,
        deliveryDeadline: computed.deliveryDeadline,
        fundingProjects: form.fundingProjects,
      })
    : [];

  return (
    <div className="planner-panel">
      <div className="planner-panel-title">{campaign ? 'Edit Campaign' : 'New Campaign'}</div>

      <div className="panel-field">
        <div className="panel-label">Crop / Input Type</div>
        <input className="panel-input" value={form.cropName} onChange={e => set('cropName', e.target.value)} placeholder="e.g. Spring Wheat" />
      </div>

      <div className="panel-field">
        <div className="panel-label">Target Planting Date</div>
        <input className="panel-input" type="date" value={form.plantingDate} onChange={e => set('plantingDate', e.target.value)} />
      </div>

      <div className="panel-field">
        <div className="panel-label">Estimated Value (USD)</div>
        <input className="panel-input" type="number" value={form.estimatedValue} onChange={e => set('estimatedValue', e.target.value)} placeholder="e.g. 85000" />
      </div>

      <div className="panel-field">
        <div className="panel-label">Procurement Type</div>
        <select className="panel-input" value={form.procurementType} onChange={e => set('procurementType', e.target.value)}>
          <option value="goods">Goods</option>
          <option value="services">Services</option>
          <option value="works">Works</option>
        </select>
      </div>

      <div className="panel-field">
        <div className="panel-label">Delivery Lead Time</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input className="panel-input" type="number" min="0" style={{ width: 70 }} value={form.deliveryWeeks} onChange={e => set('deliveryWeeks', e.target.value)} />
          <span style={{ fontSize: 12, color: '#888' }}>weeks</span>
        </div>
      </div>

      {/* Funding projects */}
      <div className="panel-field" style={{ borderTop: '1px solid #eee', paddingTop: 10 }}>
        <div className="panel-label" style={{ marginBottom: 6 }}>Funding Projects</div>
        {form.fundingProjects.map((p, i) => (
          <div key={i} className="project-block">
            <input className="panel-input" style={{ marginBottom: 5 }} placeholder="Project name / code" value={p.name} onChange={e => updateProject(i, 'name', e.target.value)} />
            <div style={{ fontSize: 10, color: '#888', marginBottom: 3 }}>PROJECT END DATE</div>
            <input className="panel-input" type="date" value={p.endDate} onChange={e => updateProject(i, 'endDate', e.target.value)} />
            <div style={{ textAlign: 'right', marginTop: 4 }}>
              <button className="action-btn delete" onClick={() => removeProject(i)}>✕ Remove</button>
            </div>
          </div>
        ))}
        <button className="add-project-btn" onClick={addProject}>+ Add funding project</button>
      </div>

      {/* Method */}
      <div className="panel-field">
        <div className="panel-label">Procurement Method</div>
        {recommended && !overrideMethod ? (
          <div className="method-recommendation">
            ✓ Recommended: <strong>{PROCESSES[recommended]?.label}</strong><br />
            <span style={{ color: '#888', fontSize: 10 }}>{PROCESSES[recommended]?.threshold}</span>
          </div>
        ) : (
          <select className="panel-input" value={form.selectedMethod} onChange={e => set('selectedMethod', e.target.value)}>
            <option value="">Select method…</option>
            {Object.entries(PROCESSES).map(([key, p]) => (
              <option key={key} value={key}>{p.label}</option>
            ))}
          </select>
        )}
        <button className="method-override-btn" onClick={() => setOverrideMethod(v => !v)}>
          {overrideMethod ? '↑ Use recommended' : 'Override method ↓'}
        </button>
      </div>

      {/* Modifiers */}
      <div className="panel-field">
        <div className="panel-label">Additional Circumstances</div>
        {visibleMods.map(m => (
          <label key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, marginBottom: 3, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.activeMods.includes(m.key)} onChange={() => toggleMod(m.key)} />
            {m.label}
          </label>
        ))}
        {applicableMods.length > 3 && (
          <button className="modifiers-toggle" onClick={() => setShowAllMods(v => !v)}>
            {showAllMods ? '↑ Show fewer' : `+ Show all ${applicableMods.length} modifiers`}
          </button>
        )}
      </div>

      {/* Custom step */}
      <div className="panel-field">
        <div className="panel-label">Custom Step (optional)</div>
        <input className="panel-input" style={{ marginBottom: 5 }} placeholder="Step label" value={form.customModifier.label} onChange={e => set('customModifier', { ...form.customModifier, label: e.target.value })} />
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input className="panel-input" type="number" min="1" style={{ width: 70 }} placeholder="Days" value={form.customModifier.days} onChange={e => set('customModifier', { ...form.customModifier, days: e.target.value })} />
          <span style={{ fontSize: 11, color: '#888' }}>working days (inserted before final step)</span>
        </div>
      </div>

      {/* Remarks */}
      <div className="panel-field">
        <div className="panel-label">Remarks / Notes</div>
        <textarea className="panel-input" rows={3} value={form.remarks} onChange={e => set('remarks', e.target.value)} placeholder="Optional notes…" style={{ resize: 'vertical' }} />
      </div>

      {/* Live deadlines */}
      {computed && (
        <div className="deadline-box">
          <div className="deadline-box-title">Calculated Deadlines</div>
          <div className="deadline-row"><span>PR must be raised by:</span><span>{formatDate(new Date(computed.prDeadline))}</span></div>
          <div className="deadline-row"><span>PO must be issued by:</span><span>{formatDate(new Date(computed.poDeadline))}</span></div>
          <div className="deadline-row"><span>Delivery by (planting):</span><span>{formatDate(new Date(computed.deliveryDeadline))}</span></div>
          {projectStatusPreview.length > 0 && (
            <div className="deadline-projects">
              {projectStatusPreview.map((p, i) => (
                <div key={i} className="deadline-row">
                  <span>{p.name || 'Project'} · ends {p.endDate ? formatDate(new Date(p.endDate)) : '?'}:</span>
                  <span style={{ color: p.status === 'ok' ? '#2e7d32' : '#e65100' }}>
                    {p.status === 'ok' ? '✓' : '⚠ At risk'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <button className="panel-save-btn" onClick={handleSave}>
        {campaign ? 'Save Changes' : 'Add Campaign'}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/planner/CampaignPanel.jsx
git commit -m "feat: add CampaignPanel side panel with live deadline calculation"
```

---

## Task 8: `CampaignTable.jsx` — summary + detail views

**Files:**
- Create: `src/planner/CampaignTable.jsx`

- [ ] **Step 1: Create `src/planner/CampaignTable.jsx`**

```jsx
// src/planner/CampaignTable.jsx
import { formatDate } from '../utils.js';
import { PROCESSES } from '../data.js';

function StatusPill({ status }) {
  const labels = { on_track: 'On Track', at_risk: 'At Risk', overdue: 'Overdue' };
  return <span className={`status-pill ${status}`}>{labels[status] || status}</span>;
}

function DateCell({ isoDate, status }) {
  const cls = status === 'on_track' ? 'date-ok' : status === 'at_risk' ? 'date-at-risk' : 'date-overdue';
  return <span className={cls}>{isoDate ? formatDate(new Date(isoDate)) : '—'}</span>;
}

function SummaryView({ campaigns, selectedId, onSelect, onEdit, onDelete, onAdd }) {
  return (
    <>
      <div className="planner-table-header">
        <div className="planner-table-title">Campaigns</div>
        <button
          style={{ background: '#1a3a2a', color: '#fff', border: 'none', padding: '5px 14px', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
          onClick={onAdd}
        >
          + Add Campaign
        </button>
      </div>
      {campaigns.length === 0 ? (
        <p style={{ color: '#999', fontSize: 13, marginTop: 20 }}>No campaigns yet. Click "+ Add Campaign" to get started.</p>
      ) : (
        <table className="planner-table">
          <thead>
            <tr>
              <th>Crop / Input</th>
              <th>Start (PR by)</th>
              <th>End (Planting)</th>
              <th>Value (USD)</th>
              <th>Method</th>
              <th>Funding Projects</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map(c => (
              <tr key={c.id} className={selectedId === c.id ? 'selected' : ''}>
                <td>
                  <div className="campaign-name">{c.cropName}</div>
                  {c.remarks && <div className="campaign-remarks-preview">{c.remarks.slice(0, 50)}{c.remarks.length > 50 ? '…' : ''}</div>}
                </td>
                <td><DateCell isoDate={c.prDeadline} status={c.status} /></td>
                <td><strong>{c.plantingDate ? formatDate(new Date(c.plantingDate)) : '—'}</strong></td>
                <td>{c.estimatedValue ? c.estimatedValue.toLocaleString() : '—'}</td>
                <td>{c.selectedMethod && PROCESSES[c.selectedMethod] ? <span className="method-tag">{PROCESSES[c.selectedMethod].label}</span> : '—'}</td>
                <td>
                  {(c.projectStatuses || []).map((p, i) => (
                    <span key={i} className={`project-tag ${p.status}`}>{p.name || 'Project'} {p.status === 'ok' ? '✓' : '⚠'}</span>
                  ))}
                </td>
                <td><StatusPill status={c.status} /></td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button className="action-btn details" onClick={() => onSelect(c.id)}>▶ Details</button>
                  <button className="action-btn edit" onClick={() => onEdit(c)}>✎</button>
                  <button className="action-btn delete" onClick={() => onDelete(c.id)}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

function DetailView({ campaign, onBack, onEdit, onDelete }) {
  const proc = PROCESSES[campaign.selectedMethod];
  const steps = campaign.steps || [];

  return (
    <>
      <div className="planner-table-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="detail-back-btn" onClick={onBack}>← All Campaigns</button>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#1a3a2a' }}>
            {campaign.cropName}
            {proc ? ` · ${proc.label}` : ''}
            {campaign.estimatedValue ? ` · USD ${campaign.estimatedValue.toLocaleString()}` : ''}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#888' }}>
            PR by: <strong>{campaign.prDeadline ? formatDate(new Date(campaign.prDeadline)) : '—'}</strong>
            {' · '}
            Planting: <strong>{campaign.plantingDate ? formatDate(new Date(campaign.plantingDate)) : '—'}</strong>
          </span>
          <button className="action-btn edit" onClick={() => onEdit(campaign)}>✎ Edit</button>
          <button className="action-btn delete" onClick={() => onDelete(campaign.id)}>✕ Delete</button>
        </div>
      </div>
      <table className="planner-table step-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Step</th>
            <th>Owner</th>
            <th>Days</th>
            <th>Earliest</th>
            <th>Latest</th>
          </tr>
        </thead>
        <tbody>
          {steps.map((step, i) => (
            <tr key={i}>
              <td style={{ color: '#aaa' }}>{i + 1}</td>
              <td>{step.name}</td>
              <td style={{ color: '#888' }}>{step.owner}</td>
              <td>{step.minDays === step.maxDays ? step.minDays : `${step.minDays}–${step.maxDays}`}{step.calendarDays ? ' cal' : ''}</td>
              <td>{step.minEnd ? formatDate(step.minEnd) : '—'}</td>
              <td>{step.maxEnd ? formatDate(step.maxEnd) : '—'}</td>
            </tr>
          ))}
          {campaign.deliveryWeeks > 0 && (
            <tr className="step-delivery-row">
              <td>🚚</td>
              <td>Delivery Period ({campaign.deliveryWeeks} wks)</td>
              <td>Supplier</td>
              <td>{campaign.deliveryWeeks * 7} cal</td>
              <td colSpan={2}>{campaign.poDeadline ? `From ${formatDate(new Date(campaign.poDeadline))}` : '—'}</td>
            </tr>
          )}
          <tr className="step-planting-row">
            <td>🌱</td>
            <td>Planting Date</td>
            <td>—</td>
            <td>—</td>
            <td colSpan={2}>{campaign.plantingDate ? formatDate(new Date(campaign.plantingDate)) : '—'}</td>
          </tr>
        </tbody>
      </table>
      {campaign.remarks && (
        <div style={{ marginTop: 12, padding: '8px 12px', background: '#f9f9f9', borderRadius: 4, fontSize: 12, color: '#555', borderLeft: '3px solid #ccc' }}>
          <strong style={{ color: '#333' }}>Notes:</strong> {campaign.remarks}
        </div>
      )}
    </>
  );
}

export default function CampaignTable({ campaigns, selectedId, onSelect, onEdit, onDelete, onAdd }) {
  const selected = selectedId ? campaigns.find(c => c.id === selectedId) : null;

  return (
    <div className="planner-table-section">
      {selected ? (
        <DetailView
          campaign={selected}
          onBack={() => onSelect(null)}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ) : (
        <SummaryView
          campaigns={campaigns}
          selectedId={selectedId}
          onSelect={onSelect}
          onEdit={onEdit}
          onDelete={onDelete}
          onAdd={onAdd}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/planner/CampaignTable.jsx
git commit -m "feat: add CampaignTable with summary and detail views"
```

---

## Task 9: `PlannerTimeline.jsx` — SVG Gantt timeline

**Files:**
- Create: `src/planner/PlannerTimeline.jsx`

- [ ] **Step 1: Create `src/planner/PlannerTimeline.jsx`**

```jsx
// src/planner/PlannerTimeline.jsx
import { formatDate } from '../utils.js';

const STATUS_COLORS = { on_track: '#4CAF50', at_risk: '#FF9800', overdue: '#e53935' };
const PROJECT_PALETTE = ['#e65100', '#6a1b9a', '#0277bd', '#2e7d32', '#c62828'];
const ROW_H = 32;
const LABEL_W = 210;
const MARKER_H = 12;
const PADDING = { top: 28, bottom: 36, right: 20 };

function toMs(iso) { return new Date(iso).getTime(); }

export default function PlannerTimeline({ campaigns, selectedId, onSelect }) {
  if (!campaigns || campaigns.length === 0) {
    return (
      <div className="planner-timeline-section">
        <div className="planner-timeline-header">
          <div className="planner-timeline-title">Agricultural Calendar</div>
        </div>
        <p style={{ color: '#999', fontSize: 12 }}>No campaigns yet.</p>
      </div>
    );
  }

  // Determine date range
  const allPR = campaigns.map(c => toMs(c.prDeadline)).filter(Boolean);
  const allPlanting = campaigns.map(c => toMs(c.plantingDate)).filter(Boolean);
  const minMs = Math.min(...allPR);
  const maxMs = Math.max(...allPlanting);
  const rangeMs = maxMs - minMs;

  // In detail mode, zoom to selected campaign
  const selected = selectedId ? campaigns.find(c => c.id === selectedId) : null;
  const displayCampaigns = selected ? [selected] : campaigns;
  const zoomMin = selected ? toMs(selected.prDeadline) : minMs;
  const zoomMax = selected ? toMs(selected.plantingDate) : maxMs;
  const zoomRange = zoomMax - zoomMin || 1;

  function xPct(ms) {
    return Math.max(0, Math.min(100, ((ms - zoomMin) / zoomRange) * 100));
  }

  // Collect unique project end dates
  const projectEndMap = {};
  campaigns.forEach(c => {
    (c.fundingProjects || []).forEach((p, pi) => {
      if (p.endDate && !projectEndMap[p.endDate]) {
        projectEndMap[p.endDate] = PROJECT_PALETTE[Object.keys(projectEndMap).length % PROJECT_PALETTE.length];
      }
    });
  });

  // Build month labels
  const months = [];
  const start = new Date(zoomMin);
  start.setDate(1);
  while (start.getTime() <= zoomMax) {
    months.push(new Date(start));
    start.setMonth(start.getMonth() + 1);
  }

  const today = new Date();
  const todayPct = xPct(today.getTime());
  const svgH = PADDING.top + displayCampaigns.length * ROW_H + PADDING.bottom;

  return (
    <div className="planner-timeline-section">
      <div className="planner-timeline-header">
        <div className="planner-timeline-title">
          {selected ? `🌾 ${selected.cropName}` : `Agricultural Calendar — ${displayCampaigns.length} campaign${displayCampaigns.length !== 1 ? 's' : ''}`}
        </div>
        <div style={{ fontSize: 10, color: '#888' }}>
          {formatDate(new Date(zoomMin))} → {formatDate(new Date(zoomMax))}
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <svg width="100%" style={{ minWidth: 500 }} height={svgH} xmlns="http://www.w3.org/2000/svg">
          {/* Month gridlines + labels */}
          {months.map((m, i) => {
            const pct = xPct(m.getTime());
            const x = `calc(${LABEL_W}px + (100% - ${LABEL_W}px) * ${pct / 100})`;
            return (
              <g key={i}>
                <line x1={x} x2={x} y1={PADDING.top} y2={svgH - PADDING.bottom} stroke="#ddd" strokeWidth={1} />
                <text x={x} y={16} fontSize={9} fill="#aaa" textAnchor="middle"
                  style={{ fontFamily: 'var(--font-mono)' }}>
                  {m.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })}
                </text>
              </g>
            );
          })}

          {/* Project end date markers */}
          {Object.entries(projectEndMap).map(([dateStr, color]) => {
            const pct = xPct(toMs(dateStr));
            if (pct < 0 || pct > 100) return null;
            const x = `calc(${LABEL_W}px + (100% - ${LABEL_W}px) * ${pct / 100})`;
            return (
              <g key={dateStr}>
                <line x1={x} x2={x} y1={PADDING.top} y2={svgH - PADDING.bottom} stroke={color} strokeWidth={1.5} strokeDasharray="5,3" opacity={0.7} />
              </g>
            );
          })}

          {/* Today marker */}
          {todayPct >= 0 && todayPct <= 100 && (
            <line
              x1={`calc(${LABEL_W}px + (100% - ${LABEL_W}px) * ${todayPct / 100})`}
              x2={`calc(${LABEL_W}px + (100% - ${LABEL_W}px) * ${todayPct / 100})`}
              y1={PADDING.top}
              y2={svgH - PADDING.bottom}
              stroke="#2563eb" strokeWidth={1.5} strokeDasharray="4,3"
            />
          )}

          {/* Campaign rows */}
          {displayCampaigns.map((c, row) => {
            const y = PADDING.top + row * ROW_H;
            const color = STATUS_COLORS[c.status] || '#4CAF50';
            const prPct = xPct(toMs(c.prDeadline));
            const plantPct = xPct(toMs(c.plantingDate));
            // Delivery window starts from poDeadline
            const poPct = c.poDeadline ? xPct(toMs(c.poDeadline)) : plantPct;

            return (
              <g key={c.id} style={{ cursor: 'pointer' }} onClick={() => onSelect(selectedId === c.id ? null : c.id)}>
                {/* Row hover background */}
                <rect x={0} y={y} width="100%" height={ROW_H} fill={selectedId === c.id ? '#e8f0e8' : 'transparent'} />

                {/* Label */}
                <text x={8} y={y + 13} fontSize={11} fontWeight={600} fill={c.status === 'overdue' ? '#c62828' : '#1a3a2a'}
                  style={{ fontFamily: 'var(--font-sans)' }}>
                  {c.cropName}
                </text>
                <text x={8} y={y + 24} fontSize={9} fill={c.status === 'overdue' ? '#c62828' : '#888'}
                  style={{ fontFamily: 'var(--font-mono)' }}>
                  {c.prDeadline ? new Date(c.prDeadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : ''}
                  {' → '}
                  {c.plantingDate ? new Date(c.plantingDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : ''}
                </text>

                {/* Procurement bar */}
                <rect
                  x={`calc(${LABEL_W}px + (100% - ${LABEL_W}px) * ${prPct / 100})`}
                  y={y + 8}
                  width={`calc((100% - ${LABEL_W}px) * ${Math.max(0, poPct - prPct) / 100})`}
                  height={MARKER_H}
                  rx={2}
                  fill={color}
                  opacity={0.85}
                />

                {/* Delivery bar */}
                {c.poDeadline && (
                  <rect
                    x={`calc(${LABEL_W}px + (100% - ${LABEL_W}px) * ${poPct / 100})`}
                    y={y + 8}
                    width={`calc((100% - ${LABEL_W}px) * ${Math.max(0, plantPct - poPct) / 100})`}
                    height={MARKER_H}
                    rx={2}
                    fill={color}
                    opacity={0.4}
                  />
                )}

                {/* Planting date marker */}
                <rect
                  x={`calc(${LABEL_W}px + (100% - ${LABEL_W}px) * ${plantPct / 100} - 2px)`}
                  y={y + 4}
                  width={4}
                  height={ROW_H - 8}
                  rx={1}
                  fill={color}
                />
              </g>
            );
          })}

          {/* Project end date labels at bottom */}
          {Object.entries(projectEndMap).map(([dateStr, color]) => {
            const pct = xPct(toMs(dateStr));
            if (pct < 0 || pct > 100) return null;
            return (
              <text
                key={dateStr}
                x={`calc(${LABEL_W}px + (100% - ${LABEL_W}px) * ${pct / 100})`}
                y={svgH - 4}
                fontSize={8}
                fill={color}
                textAnchor="middle"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
              </text>
            );
          })}

          {/* Legend */}
          <text x={8} y={svgH - 6} fontSize={8} fill="#aaa" style={{ fontFamily: 'var(--font-sans)' }}>
            ■ Procurement &nbsp; □ Delivery &nbsp; | Planting &nbsp; ┆ Today &nbsp; -- Project end
          </text>
        </svg>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/planner/PlannerTimeline.jsx
git commit -m "feat: add PlannerTimeline SVG Gantt component"
```

---

## Task 10: Link from existing app + final wiring

**Files:**
- Modify: `src/App.jsx` (header section, lines 878–896)

- [ ] **Step 1: Add planner link to the existing app header**

In `src/App.jsx`, find the closing `</div>` of `.app-header-inner` (around line 895) and add the link just before it closes:

```jsx
// In the app-header-inner div, after the existing text content div:
<a
  href="/planner"
  style={{
    marginLeft: 'auto',
    fontSize: 11,
    color: '#fff',
    opacity: 0.7,
    border: '1px solid rgba(255,255,255,0.3)',
    padding: '3px 10px',
    borderRadius: 3,
    textDecoration: 'none',
    flexShrink: 0,
  }}
  onMouseOver={e => e.currentTarget.style.opacity = 1}
  onMouseOut={e => e.currentTarget.style.opacity = 0.7}
>
  🌱 Agricultural Planner
</a>
```

The full updated header block (lines 878–896) becomes:

```jsx
{/* HEADER */}
<div className="app-header">
  <div className="app-header-inner">
    <img
      src="https://www.fao.org/images/corporatelibraries/fao-logo/fao-logo-en.svg"
      alt="FAO Logo"
      style={{ height: 36, width: "auto", filter: "brightness(0) invert(1)", flexShrink: 0 }}
      onError={e => { e.target.style.display = "none"; }}
    />
    <div>
      <div className="app-header-subtitle">Food and Agriculture Organization of the United Nations</div>
      <div className="app-header-title">Procurement Timeline Estimator</div>
      <div className="app-header-org">FAO Ukraine Country Office (FAOUA) · Manual Section 502 &amp; FAOUA SOPs</div>
      <div style={{ marginTop: 3, fontSize: 10, opacity: 0.6, fontFamily: "var(--font-mono)" }}>
        {holidaysLoading ? "Loading UA holidays…" : holidaysError ? "Holidays unavailable (weekends only)" : `UA public holidays loaded (${holidays.size} days)`}
      </div>
    </div>
    <a
      href="/planner"
      style={{
        marginLeft: 'auto',
        fontSize: 11,
        color: '#fff',
        opacity: 0.7,
        border: '1px solid rgba(255,255,255,0.3)',
        padding: '3px 10px',
        borderRadius: 3,
        textDecoration: 'none',
        flexShrink: 0,
      }}
      onMouseOver={e => e.currentTarget.style.opacity = '1'}
      onMouseOut={e => e.currentTarget.style.opacity = '0.7'}
    >
      🌱 Agricultural Planner
    </a>
  </div>
</div>
```

- [ ] **Step 2: Run the full test suite to confirm nothing is broken**

```bash
npx vitest run --reporter=verbose 2>&1
```

Expected: all tests pass (utils.planner.test.js + useCampaigns.test.js).

- [ ] **Step 3: Start dev server and verify both pages load**

```bash
npx vite --port 5174 2>&1 &
sleep 3
curl -s http://localhost:5174/ | grep -o "<title>[^<]*"
curl -s http://localhost:5174/planner | grep -o "<title>[^<]*"
kill %1
```

Expected:
```
<title>FAO Ukraine — Procurement Timeline
<title>FAO Ukraine — Agricultural Input Planner
```

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx
git commit -m "feat: add Agricultural Planner link to existing app header"
```

---

## Task 11: Build verification + `.gitignore` update

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Add `.superpowers/` to `.gitignore`**

Open `.gitignore` and add at the bottom:
```
.superpowers/
```

- [ ] **Step 2: Run production build**

```bash
npx vite build 2>&1
```

Expected: Build succeeds with output like:
```
dist/index.html
dist/planner.html
dist/assets/...
```
No errors.

- [ ] **Step 3: Final commit**

```bash
git add .gitignore
git commit -m "chore: add .superpowers to .gitignore and verify production build"
```

---

## Self-Review Checklist

**Spec coverage:**
- ✅ §2 Architecture: new Vite entry point — Tasks 1, 5
- ✅ §3 Backward planning logic — Task 2 (`computeBackwardTimeline`)
- ✅ §3 Status logic (on_track/at_risk/overdue) — Task 2 (`computeCampaignStatus`)
- ✅ §4 Data model (all fields including customModifier, fundingProjects, remarks) — Tasks 6, 7
- ✅ §5 Stacked layout — Task 6 (PlannerApp layout shell)
- ✅ §6 Timeline overview + detail mode — Task 9 (PlannerTimeline)
- ✅ §6 Project end date markers on timeline — Task 9
- ✅ §7 Summary table with Start/End columns + project tags + remarks preview — Task 8
- ✅ §7 Detail step breakdown with delivery + planting rows — Task 8
- ✅ §8 Side panel all fields (crop, planting, value, delivery, projects, method, modifiers, custom step, remarks) — Task 7
- ✅ §8 Live deadline calculation box in panel — Task 7
- ✅ §8 Edit and delete — Tasks 6, 8
- ✅ §9 Vercel Blob API — Tasks 3, 4
- ✅ §11 Vite multi-entry config — Task 1
- ✅ §12 Styling (dark green header, planner.css) — Task 5
- ✅ Nav link from existing app — Task 10

**Placeholder scan:** No TBDs or TODOs found.

**Type consistency:** `computeBackwardTimeline` signature is consistent across Task 2 (definition), Task 6 (PlannerApp usage), Task 7 (CampaignPanel usage). Field names `prDeadline`, `poDeadline`, `deliveryDeadline`, `fundingProjects`, `customModifier` used consistently.

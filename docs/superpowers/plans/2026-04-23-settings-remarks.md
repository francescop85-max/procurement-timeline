# Settings Panel, Inline Step Editing & Monitoring Remarks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a gear-icon Settings modal (country/holiday selector + editable default lead times), inline min/max editing in the StepEditor, and a Remarks column in monitoring mode.

**Architecture:** Settings state (`countryCode`, `leadTimeOverrides`) lives in App.jsx, initialized from localStorage and encoded into the URL hash cfg object so shared links are self-contained. `useHolidays` is parameterized to accept `countryCode`. Lead time overrides are applied as a thin layer over `buildSteps()` when `stepOverride` is null. Remarks reuse the existing `useActuals` storage (each step entry already supports arbitrary extra fields via object spread).

**Tech Stack:** React 18 useState, localStorage, existing `useHolidays` / `useActuals` hooks, Nager Date public holidays API (`date.nager.at`).

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/hooks/useHolidays.js` | **Modify** | Accept `countryCode` param instead of hardcoded `'UA'`; re-fetch when it changes |
| `src/components/SettingsModal.jsx` | **Create** | Gear-icon modal: Calendar tab (country dropdown) + Lead Times tab (editable step durations for current process) |
| `src/App.jsx` | **Modify** | Add `countryCode` + `leadTimeOverrides` state; initialize from localStorage; encode in URL hash; apply overrides in step computation; render SettingsModal |
| `src/components/StepEditor.jsx` | **Modify** | Add inline min/max day editing per existing step row |
| `src/App.jsx` (StepsTable) | **Modify** | Add Remarks column in tracking mode; wire to `updateActual` |

---

## Task 1: Parameterize useHolidays with countryCode

**Files:**
- Modify: `src/hooks/useHolidays.js`

**Context:** Currently `useHolidays()` fetches `UA` holidays with no parameters. We make it accept a `countryCode` string and re-fetch when it changes.

- [ ] **Step 1: Rewrite useHolidays to accept countryCode**

Replace the entire content of `src/hooks/useHolidays.js` with:

```js
import { useState, useEffect } from 'react';

export function useHolidays(countryCode = 'UA') {
  const [holidays, setHolidays] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const currentYear = new Date().getFullYear();
    const years = [currentYear, currentYear + 1, currentYear + 2];

    Promise.all(
      years.map(year =>
        fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`)
          .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      )
    )
      .then(results => {
        const allDates = new Set();
        results.flat().forEach(h => allDates.add(h.date));
        setHolidays(allDates);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setHolidays(new Set());
        setLoading(false);
      });
  }, [countryCode]);

  return { holidays, loading, error };
}
```

- [ ] **Step 2: Run tests to verify nothing breaks**

```bash
npm test
```

Expected: all tests pass (useHolidays change doesn't affect existing test suite).

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useHolidays.js
git commit -m "feat: parameterize useHolidays with countryCode"
```

---

## Task 2: Add countryCode + leadTimeOverrides state to App.jsx

**Files:**
- Modify: `src/App.jsx` (around lines 679–690, 735–740, 764–766, 866–876)

**Context:**
- `countryCode`: string, default `'UA'`, persisted in localStorage key `procurement_country`
- `leadTimeOverrides`: object `{ [procKey]: { [stepName]: { minDays: number, maxDays: number } } }`, persisted in localStorage key `procurement_lead_time_overrides`
- Both encoded into the URL hash `cfg` object when sharing

- [ ] **Step 1: Add localStorage helpers at the top of App.jsx** (inside the App function, before the useState declarations at line 675)

Find the line:
```js
  const [selected, setSelected] = useState(null);
```

Add these two helper functions just above it:
```js
  function loadLS(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
  }
  function saveLS(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }
```

- [ ] **Step 2: Add countryCode and leadTimeOverrides useState declarations**

Find (around line 680):
```js
  const [activeMods, setActiveMods] = useState([]);
  const [stepOverride, setStepOverride] = useState(null); // null = use defaults
```

Add after the `stepOverride` line:
```js
  const [countryCode, setCountryCode] = useState(() => loadLS('procurement_country', 'UA'));
  const [leadTimeOverrides, setLeadTimeOverrides] = useState(() => loadLS('procurement_lead_time_overrides', {}));
```

- [ ] **Step 3: Pass countryCode to useHolidays**

Find (around line 687):
```js
  const { holidays, loading: holidaysLoading, error: holidaysError } = useHolidays();
```

Replace with:
```js
  const { holidays, loading: holidaysLoading, error: holidaysError } = useHolidays(countryCode);
```

- [ ] **Step 4: Persist countryCode and leadTimeOverrides to localStorage when they change**

Add these two useEffect calls right after the useHolidays line:
```js
  useEffect(() => { saveLS('procurement_country', countryCode); }, [countryCode]);
  useEffect(() => { saveLS('procurement_lead_time_overrides', leadTimeOverrides); }, [leadTimeOverrides]);
```

- [ ] **Step 5: Decode countryCode and leadTimeOverrides from URL hash**

Find the hash-loading block (around line 735):
```js
          setStepOverride(cfg.stepOverride || null);
          setDeliveryWeeks(cfg.deliveryWeeks || 0);
```

Add between those two lines:
```js
          if (cfg.countryCode) setCountryCode(cfg.countryCode);
          if (cfg.leadTimeOverrides) setLeadTimeOverrides(cfg.leadTimeOverrides);
```

- [ ] **Step 6: Add applyLeadTimeOverrides helper + wire into step computation**

Find (around line 764):
```js
  const steps = selected
    ? (stepOverride ?? buildSteps(selected, effectiveActiveMods, PROCESSES, MODIFIERS))
    : [];
```

Replace with:
```js
  function applyLeadTimeOverrides(rawSteps) {
    const procOverrides = leadTimeOverrides[selected];
    if (!procOverrides) return rawSteps;
    return rawSteps.map(s => {
      const o = procOverrides[s.name];
      return o ? { ...s, minDays: o.minDays ?? s.minDays, maxDays: o.maxDays ?? s.maxDays } : s;
    });
  }

  const steps = selected
    ? (stepOverride ?? applyLeadTimeOverrides(buildSteps(selected, effectiveActiveMods, PROCESSES, MODIFIERS)))
    : [];
```

- [ ] **Step 7: Include countryCode and leadTimeOverrides in currentPlanConfig**

Find (around line 866):
```js
  const currentPlanConfig = selected ? {
    selected,
    prDate,
    activeMods: effectiveActiveMods,
    stepOverride: stepOverride ?? undefined,
    deliveryWeeks,
    estimatedValue,
    desiredPoDate,
    desiredDeliveryDate,
  } : null;
```

Replace with:
```js
  const currentPlanConfig = selected ? {
    selected,
    prDate,
    activeMods: effectiveActiveMods,
    stepOverride: stepOverride ?? undefined,
    countryCode: countryCode !== 'UA' ? countryCode : undefined,
    leadTimeOverrides: Object.keys(leadTimeOverrides).length ? leadTimeOverrides : undefined,
    deliveryWeeks,
    estimatedValue,
    desiredPoDate,
    desiredDeliveryDate,
  } : null;
```

- [ ] **Step 8: Run tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 9: Commit**

```bash
git add src/App.jsx
git commit -m "feat: add countryCode and leadTimeOverrides state with localStorage + URL hash persistence"
```

---

## Task 3: Build SettingsModal component

**Files:**
- Create: `src/components/SettingsModal.jsx`

**Context:** A modal with two tabs — "Calendar" (country dropdown) and "Lead Times" (editable step durations for the currently selected process). Receives props from App.jsx and calls back to update state.

The Nager Date API supports these country codes (curated list for FAO operations):

```js
const COUNTRY_LIST = [
  { code: 'UA', name: 'Ukraine' },
  { code: 'AF', name: 'Afghanistan' },
  { code: 'AL', name: 'Albania' },
  { code: 'AM', name: 'Armenia' },
  { code: 'AZ', name: 'Azerbaijan' },
  { code: 'BA', name: 'Bosnia & Herzegovina' },
  { code: 'BD', name: 'Bangladesh' },
  { code: 'BR', name: 'Brazil' },
  { code: 'CD', name: 'Congo (DRC)' },
  { code: 'CO', name: 'Colombia' },
  { code: 'DE', name: 'Germany' },
  { code: 'EG', name: 'Egypt' },
  { code: 'ET', name: 'Ethiopia' },
  { code: 'FR', name: 'France' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'GE', name: 'Georgia' },
  { code: 'GT', name: 'Guatemala' },
  { code: 'HN', name: 'Honduras' },
  { code: 'HT', name: 'Haiti' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'IN', name: 'India' },
  { code: 'IQ', name: 'Iraq' },
  { code: 'IT', name: 'Italy' },
  { code: 'JO', name: 'Jordan' },
  { code: 'KE', name: 'Kenya' },
  { code: 'KG', name: 'Kyrgyzstan' },
  { code: 'KZ', name: 'Kazakhstan' },
  { code: 'LB', name: 'Lebanon' },
  { code: 'LY', name: 'Libya' },
  { code: 'MA', name: 'Morocco' },
  { code: 'MD', name: 'Moldova' },
  { code: 'ME', name: 'Montenegro' },
  { code: 'MG', name: 'Madagascar' },
  { code: 'ML', name: 'Mali' },
  { code: 'MM', name: 'Myanmar' },
  { code: 'MX', name: 'Mexico' },
  { code: 'MZ', name: 'Mozambique' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'NI', name: 'Nicaragua' },
  { code: 'NP', name: 'Nepal' },
  { code: 'NO', name: 'Norway' },
  { code: 'PH', name: 'Philippines' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'PL', name: 'Poland' },
  { code: 'RO', name: 'Romania' },
  { code: 'RS', name: 'Serbia' },
  { code: 'SD', name: 'Sudan' },
  { code: 'SN', name: 'Senegal' },
  { code: 'SO', name: 'Somalia' },
  { code: 'SS', name: 'South Sudan' },
  { code: 'SY', name: 'Syria' },
  { code: 'TJ', name: 'Tajikistan' },
  { code: 'TN', name: 'Tunisia' },
  { code: 'TZ', name: 'Tanzania' },
  { code: 'UG', name: 'Uganda' },
  { code: 'US', name: 'United States' },
  { code: 'UZ', name: 'Uzbekistan' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'YE', name: 'Yemen' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'ZM', name: 'Zambia' },
  { code: 'ZW', name: 'Zimbabwe' },
];
```

- [ ] **Step 1: Create src/components/SettingsModal.jsx**

```jsx
import { useState } from "react";

const COUNTRY_LIST = [
  { code: 'UA', name: 'Ukraine' },
  { code: 'AF', name: 'Afghanistan' },
  { code: 'AL', name: 'Albania' },
  { code: 'AM', name: 'Armenia' },
  { code: 'AZ', name: 'Azerbaijan' },
  { code: 'BA', name: 'Bosnia & Herzegovina' },
  { code: 'BD', name: 'Bangladesh' },
  { code: 'BR', name: 'Brazil' },
  { code: 'CD', name: 'Congo (DRC)' },
  { code: 'CO', name: 'Colombia' },
  { code: 'DE', name: 'Germany' },
  { code: 'EG', name: 'Egypt' },
  { code: 'ET', name: 'Ethiopia' },
  { code: 'FR', name: 'France' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'GE', name: 'Georgia' },
  { code: 'GT', name: 'Guatemala' },
  { code: 'HN', name: 'Honduras' },
  { code: 'HT', name: 'Haiti' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'IN', name: 'India' },
  { code: 'IQ', name: 'Iraq' },
  { code: 'IT', name: 'Italy' },
  { code: 'JO', name: 'Jordan' },
  { code: 'KE', name: 'Kenya' },
  { code: 'KG', name: 'Kyrgyzstan' },
  { code: 'KZ', name: 'Kazakhstan' },
  { code: 'LB', name: 'Lebanon' },
  { code: 'LY', name: 'Libya' },
  { code: 'MA', name: 'Morocco' },
  { code: 'MD', name: 'Moldova' },
  { code: 'ME', name: 'Montenegro' },
  { code: 'MG', name: 'Madagascar' },
  { code: 'ML', name: 'Mali' },
  { code: 'MM', name: 'Myanmar' },
  { code: 'MX', name: 'Mexico' },
  { code: 'MZ', name: 'Mozambique' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'NI', name: 'Nicaragua' },
  { code: 'NP', name: 'Nepal' },
  { code: 'NO', name: 'Norway' },
  { code: 'PH', name: 'Philippines' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'PL', name: 'Poland' },
  { code: 'RO', name: 'Romania' },
  { code: 'RS', name: 'Serbia' },
  { code: 'SD', name: 'Sudan' },
  { code: 'SN', name: 'Senegal' },
  { code: 'SO', name: 'Somalia' },
  { code: 'SS', name: 'South Sudan' },
  { code: 'SY', name: 'Syria' },
  { code: 'TJ', name: 'Tajikistan' },
  { code: 'TN', name: 'Tunisia' },
  { code: 'TZ', name: 'Tanzania' },
  { code: 'UG', name: 'Uganda' },
  { code: 'US', name: 'United States' },
  { code: 'UZ', name: 'Uzbekistan' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'YE', name: 'Yemen' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'ZM', name: 'Zambia' },
  { code: 'ZW', name: 'Zimbabwe' },
];

export default function SettingsModal({ onClose, countryCode, onCountryChange, steps, procLabel, leadTimeOverrides, selectedProcKey, onLeadTimeOverridesChange }) {
  const [tab, setTab] = useState('calendar');

  // Local draft of overrides for the current process — committed on Save
  const procOverrides = (leadTimeOverrides[selectedProcKey] || {});
  const [draft, setDraft] = useState(() => {
    if (!steps) return {};
    const init = {};
    steps.forEach(s => {
      init[s.name] = {
        minDays: String(procOverrides[s.name]?.minDays ?? s.minDays),
        maxDays: String(procOverrides[s.name]?.maxDays ?? s.maxDays),
      };
    });
    return init;
  });

  function handleSaveLeadTimes() {
    if (!selectedProcKey || !steps) return;
    const updated = { ...leadTimeOverrides };
    const procEntry = {};
    let hasChange = false;
    steps.forEach(s => {
      const min = parseInt(draft[s.name]?.minDays, 10);
      const max = parseInt(draft[s.name]?.maxDays, 10);
      if (!isNaN(min) && !isNaN(max) && min >= 1 && max >= min) {
        if (min !== s.minDays || max !== s.maxDays) {
          procEntry[s.name] = { minDays: min, maxDays: max };
          hasChange = true;
        }
      }
    });
    if (hasChange) {
      updated[selectedProcKey] = procEntry;
    } else {
      delete updated[selectedProcKey];
    }
    onLeadTimeOverridesChange(updated);
    onClose();
  }

  function handleResetLeadTimes() {
    if (!selectedProcKey) return;
    const updated = { ...leadTimeOverrides };
    delete updated[selectedProcKey];
    onLeadTimeOverridesChange(updated);
    if (steps) {
      const reset = {};
      steps.forEach(s => { reset[s.name] = { minDays: String(s.minDays), maxDays: String(s.maxDays) }; });
      setDraft(reset);
    }
  }

  const overlayStyle = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };
  const modalStyle = {
    background: '#fff', borderRadius: 10, boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
    width: 480, maxWidth: '95vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column',
  };
  const tabBtnStyle = (active) => ({
    flex: 1, padding: '10px 0', fontSize: 13, fontWeight: active ? 700 : 500,
    background: 'none', border: 'none', borderBottom: active ? '2px solid #1a5276' : '2px solid transparent',
    cursor: 'pointer', color: active ? '#1a5276' : '#666',
  });

  return (
    <div style={overlayStyle} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={modalStyle}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #eee' }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>⚙️ Settings</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#888', lineHeight: 1 }}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #eee' }}>
          <button style={tabBtnStyle(tab === 'calendar')} onClick={() => setTab('calendar')}>Calendar & Holidays</button>
          <button style={tabBtnStyle(tab === 'leadtimes')} onClick={() => setTab('leadtimes')}>Lead Times</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

          {tab === 'calendar' && (
            <div>
              <div style={{ fontSize: 13, color: '#555', marginBottom: 14, lineHeight: 1.5 }}>
                Select the country whose public holidays should be used to calculate working days. Changes apply immediately to all timelines.
              </div>
              <label style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#333', display: 'block', marginBottom: 6 }}>
                Country
              </label>
              <select
                value={countryCode}
                onChange={e => onCountryChange(e.target.value)}
                style={{ width: '100%', border: '1.5px solid #ccc', borderRadius: 6, padding: '8px 10px', fontSize: 14 }}
              >
                {COUNTRY_LIST.map(c => (
                  <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
                ))}
              </select>
              <div style={{ marginTop: 10, fontSize: 11, color: '#888' }}>
                Holiday data provided by <a href="https://date.nager.at" target="_blank" rel="noreferrer" style={{ color: '#1a5276' }}>date.nager.at</a>. Not all countries are supported; weekends are always excluded regardless.
              </div>
            </div>
          )}

          {tab === 'leadtimes' && (
            <div>
              {!selectedProcKey || !steps ? (
                <div style={{ color: '#888', fontSize: 13, textAlign: 'center', paddingTop: 30 }}>
                  Select a procurement method on the main screen first to edit its default lead times.
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 13, color: '#555', marginBottom: 14, lineHeight: 1.5 }}>
                    Override the default min/max working days for each step of <strong>{procLabel}</strong>. These defaults apply to all new timelines on this device and are encoded in shared links.
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #eee' }}>
                        <th style={{ textAlign: 'left', padding: '6px 4px', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', color: '#888' }}>Step</th>
                        <th style={{ textAlign: 'center', padding: '6px 4px', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', color: '#888', width: 80 }}>Min days</th>
                        <th style={{ textAlign: 'center', padding: '6px 4px', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', color: '#888', width: 80 }}>Max days</th>
                      </tr>
                    </thead>
                    <tbody>
                      {steps.map((s, i) => {
                        const d = draft[s.name] || { minDays: String(s.minDays), maxDays: String(s.maxDays) };
                        const overridden = procOverrides[s.name];
                        return (
                          <tr key={i} style={{ borderBottom: '1px solid #f0f0f0', background: overridden ? '#fffbe6' : 'transparent' }}>
                            <td style={{ padding: '6px 4px', color: '#333' }}>
                              {s.name}
                              {overridden && <span style={{ fontSize: 10, color: '#b7770d', marginLeft: 5 }}>modified</span>}
                            </td>
                            <td style={{ padding: '4px' }}>
                              <input
                                type="number" min="1"
                                value={d.minDays}
                                onChange={e => setDraft(p => ({ ...p, [s.name]: { ...d, minDays: e.target.value } }))}
                                style={{ width: '100%', border: '1px solid #ccc', borderRadius: 4, padding: '3px 6px', fontSize: 13, textAlign: 'center' }}
                              />
                            </td>
                            <td style={{ padding: '4px' }}>
                              <input
                                type="number" min="1"
                                value={d.maxDays}
                                onChange={e => setDraft(p => ({ ...p, [s.name]: { ...d, maxDays: e.target.value } }))}
                                style={{ width: '100%', border: '1px solid #ccc', borderRadius: 4, padding: '3px 6px', fontSize: 13, textAlign: 'center' }}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                    <button
                      onClick={handleSaveLeadTimes}
                      style={{ flex: 1, padding: '8px 0', borderRadius: 6, border: 'none', background: '#1a5276', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                    >
                      Save
                    </button>
                    <button
                      onClick={handleResetLeadTimes}
                      style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #aaa', background: '#f5f5f5', color: '#555', fontSize: 13, cursor: 'pointer' }}
                    >
                      Reset to defaults
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/SettingsModal.jsx
git commit -m "feat: add SettingsModal component with calendar and lead times tabs"
```

---

## Task 4: Wire SettingsModal into App.jsx (gear icon)

**Files:**
- Modify: `src/App.jsx`

**Context:** Add a gear icon button in the app header. When clicked, opens `SettingsModal`. Pass all required props. The "Lead Times" tab needs the default (non-overridden) base steps so it shows original values alongside the editable fields.

- [ ] **Step 1: Import SettingsModal**

Find in App.jsx:
```js
import StepEditor from "./components/StepEditor";
```

Add after it:
```js
import SettingsModal from "./components/SettingsModal";
```

- [ ] **Step 2: Add showSettings state**

Find (around line 689):
```js
  const [showPlans, setShowPlans] = useState(false);
```

Add after it:
```js
  const [showSettings, setShowSettings] = useState(false);
```

- [ ] **Step 3: Add gear icon button to the header**

Find the header area in the JSX. Search for:
```jsx
              {holidaysLoading ? "Loading UA holidays…" : holidaysError ? "Holidays unavailable (weekends only)" : `UA public holidays loaded (${holidays.size} days)`}
```

Replace that entire status string with a dynamic version and add the gear button:
```jsx
              {holidaysLoading
                ? `Loading ${countryCode} holidays…`
                : holidaysError
                  ? `Holidays unavailable (weekends only)`
                  : `${countryCode} public holidays loaded (${holidays.size} days)`}
              <button
                onClick={() => setShowSettings(true)}
                title="Settings"
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, marginLeft: 8, color: '#555', verticalAlign: 'middle', padding: '0 2px' }}
              >
                ⚙️
              </button>
```

- [ ] **Step 4: Render SettingsModal when showSettings is true**

Find the very end of the App component's return JSX — just before the final closing `</div>` or `</>`. Add:

```jsx
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          countryCode={countryCode}
          onCountryChange={code => setCountryCode(code)}
          steps={selected ? buildSteps(selected, effectiveActiveMods, PROCESSES, MODIFIERS) : null}
          procLabel={proc ? proc.label : null}
          leadTimeOverrides={leadTimeOverrides}
          selectedProcKey={selected}
          onLeadTimeOverridesChange={setLeadTimeOverrides}
        />
      )}
```

- [ ] **Step 5: Run build to verify no errors**

```bash
npm run build 2>&1 | tail -10
```

Expected: `✓ built in ...` with no errors.

- [ ] **Step 6: Commit**

```bash
git add src/App.jsx
git commit -m "feat: wire SettingsModal into app header gear icon"
```

---

## Task 5: Add inline min/max editing to StepEditor

**Files:**
- Modify: `src/components/StepEditor.jsx`

**Context:** Each step row in StepEditor currently shows min/max days as read-only text. We add a pencil button that expands into editable inputs. On blur/confirm, the change is applied to the `steps` array via `onStepsChange`.

- [ ] **Step 1: Replace SortableStep with an inline-editable version**

Open `src/components/StepEditor.jsx`. Replace the existing `SortableStep` function with:

```jsx
function SortableStep({ step, index, onDelete, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [editMin, setEditMin] = useState(String(step.minDays));
  const [editMax, setEditMax] = useState(String(step.maxDays));

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: step._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    background: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: 6,
    marginBottom: 4,
    fontSize: 13,
  };

  function commitEdit() {
    const min = parseInt(editMin, 10);
    const max = parseInt(editMax, 10);
    if (!isNaN(min) && !isNaN(max) && min >= 1 && max >= min) {
      onUpdate(index, { minDays: min, maxDays: max });
    } else {
      setEditMin(String(step.minDays));
      setEditMax(String(step.maxDays));
    }
    setEditing(false);
  }

  return (
    <div ref={setNodeRef} style={style}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px' }}>
        <span
          {...attributes}
          {...listeners}
          style={{ cursor: 'grab', color: '#aaa', fontSize: 16, userSelect: 'none', flexShrink: 0 }}
          title="Drag to reorder"
        >
          ⠿
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {step.name}
          </div>
          <div style={{ color: '#666', fontSize: 11 }}>
            {step.owner} · {step.minDays}–{step.maxDays} days
          </div>
        </div>
        <button
          onClick={() => { setEditing(e => !e); setEditMin(String(step.minDays)); setEditMax(String(step.maxDays)); }}
          title="Edit days"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1a5276', fontSize: 14, padding: '2px 4px', flexShrink: 0 }}
        >
          ✏️
        </button>
        <button
          onClick={() => onDelete(index)}
          title="Delete step"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c0392b', fontSize: 18, padding: '2px 4px', flexShrink: 0, lineHeight: 1 }}
        >
          ×
        </button>
      </div>

      {editing && (
        <div style={{ padding: '6px 8px 8px', borderTop: '1px solid #f0f0f0', display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 10, color: '#888', display: 'block', marginBottom: 2 }}>Min days</label>
            <input
              type="number" min="1"
              value={editMin}
              onChange={e => setEditMin(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && commitEdit()}
              style={{ width: '100%', border: '1px solid #ccc', borderRadius: 4, padding: '3px 6px', fontSize: 13 }}
              autoFocus
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 10, color: '#888', display: 'block', marginBottom: 2 }}>Max days</label>
            <input
              type="number" min="1"
              value={editMax}
              onChange={e => setEditMax(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && commitEdit()}
              style={{ width: '100%', border: '1px solid #ccc', borderRadius: 4, padding: '3px 6px', fontSize: 13 }}
            />
          </div>
          <div style={{ display: 'flex', gap: 4, marginTop: 14 }}>
            <button onClick={commitEdit} style={{ padding: '3px 10px', borderRadius: 4, border: 'none', background: '#1a5276', color: '#fff', fontSize: 12, cursor: 'pointer' }}>✓</button>
            <button onClick={() => setEditing(false)} style={{ padding: '3px 8px', borderRadius: 4, border: '1px solid #ccc', background: '#f5f5f5', fontSize: 12, cursor: 'pointer' }}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add onUpdate prop to SortableStep usage and the handler**

In the `StepEditor` default export function, add `handleUpdate`:

```js
  function handleUpdate(index, patch) {
    const updated = steps.map((s, i) => i === index ? { ...s, ...patch } : s);
    onStepsChange(updated);
  }
```

And pass `onUpdate={handleUpdate}` to `<SortableStep>`:

Find:
```jsx
          {stepsWithIds.map((step, i) => (
            <SortableStep key={step._id} step={step} index={i} onDelete={handleDelete} />
          ))}
```

Replace with:
```jsx
          {stepsWithIds.map((step, i) => (
            <SortableStep key={step._id} step={step} index={i} onDelete={handleDelete} onUpdate={handleUpdate} />
          ))}
```

- [ ] **Step 3: Run build**

```bash
npm run build 2>&1 | tail -5
```

Expected: `✓ built in ...` — no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/StepEditor.jsx
git commit -m "feat: add inline min/max day editing to StepEditor step rows"
```

---

## Task 6: Add Remarks column in monitoring mode

**Files:**
- Modify: `src/App.jsx` (the `StepsTable` sub-component at line ~200)

**Context:** In tracking mode, `StepsTable` already shows "Actual" and "Status" columns. We add a "Remarks" column as the last column. `actuals[i]` is `{ actualEnd: "...", remark: "..." }` — the `updateActual` hook already merges fields so `updateActual(i, { remark: "text" })` works without any hook changes.

- [ ] **Step 1: Add Remarks column header to StepsTable**

In `src/App.jsx`, find the `StepsTable` component (around line 200). Find the table header row:
```jsx
              {trackingMode && <th style={{ width: 110 }}>Actual</th>}
              {trackingMode && <th style={{ width: 80 }}>Status</th>}
```

Add after the Status th:
```jsx
              {trackingMode && <th style={{ minWidth: 140 }}>Remarks</th>}
```

- [ ] **Step 2: Add Remarks cell to each step row**

In the same `StepsTable` component, find the two lines at the bottom of each step row:
```jsx
                  {trackingMode && (
```
(there are two of these — the Actual input and the Status td). Find the closing of the Status td block. It should end with something like:
```jsx
                  {trackingMode && <td ...>...</td>}
```

Add a new remarks cell after the last `trackingMode` td in the row:

```jsx
                  {trackingMode && (
                    <td style={{ padding: '4px 6px', verticalAlign: 'top' }}>
                      <input
                        type="text"
                        value={actuals[i]?.remark || ''}
                        onChange={e => onActualChange(i, { remark: e.target.value || undefined })}
                        placeholder="Add remark…"
                        style={{
                          width: '100%', border: '1px solid #ddd', borderRadius: 4,
                          padding: '3px 6px', fontSize: 12, background: '#fafafa',
                          fontFamily: 'var(--font-body)', minWidth: 120,
                        }}
                      />
                    </td>
                  )}
```

- [ ] **Step 3: Add a blank spacer for the Remarks column in the totals/footer row**

In `StepsTable`, find the footer/totals row (the `<tr>` after all steps that shows total days). It has two trailing `{trackingMode && <td />}` cells (one for Actual, one for Status). Add a third:
```jsx
              {trackingMode && <td />}
              {trackingMode && <td />}
              {trackingMode && <td />}
```

Make sure this matches the existing pattern — just add one more `{trackingMode && <td />}`.

- [ ] **Step 4: Run build and tests**

```bash
npm run build 2>&1 | tail -5 && npm test 2>&1 | tail -6
```

Expected: build success + all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx
git commit -m "feat: add Remarks column to monitoring timeline table"
```

---

## Self-Review

### Spec Coverage
| Requirement | Task |
|---|---|
| Settings panel with gear icon | Task 3 (modal), Task 4 (gear icon + wire-up) |
| Country/holiday selector | Task 1 (parameterize hook), Task 3 (Calendar tab) |
| Country persisted in localStorage + URL hash | Task 2 Steps 4 & 7 |
| Editable default lead times | Task 3 (Lead Times tab) |
| Lead times persisted in localStorage + URL hash | Task 2 Steps 4 & 7 |
| Lead time overrides applied to step computation | Task 2 Step 6 |
| Inline min/max editing in StepEditor | Task 5 |
| Remarks column in monitoring mode | Task 6 |
| Remarks persisted in useActuals localStorage | Task 6 (uses existing `updateActual` merge) |

### Placeholder Scan
- All steps contain complete code. No TBDs.

### Type Consistency
- `leadTimeOverrides`: `{ [procKey: string]: { [stepName: string]: { minDays: number, maxDays: number } } }` — consistent across Task 2 (App.jsx state), Task 3 (SettingsModal props + handlers), and Task 4 (prop passing).
- `countryCode`: `string` — consistent across useHolidays param, App.jsx state, SettingsModal prop.
- `actuals[i].remark`: `string | undefined` — consistent between Task 6 cell render and `updateActual(i, { remark: value })` call.
- `applyLeadTimeOverrides` is defined as an inner function inside App; it closes over `selected` and `leadTimeOverrides` — consistent with how `effectiveActiveMods` and other derived values work in that codebase.

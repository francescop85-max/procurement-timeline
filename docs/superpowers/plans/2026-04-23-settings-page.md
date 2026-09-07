# Settings Page with Lead Time Profiles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the SettingsModal with a full Settings page (gear icon → `view = 'settings'`) that manages named lead-time profiles; each profile carries a country code and per-process step overrides, one profile is active at a time and drives the whole app.

**Architecture:** A `profiles` array and `activeProfileId` string live in App.jsx state (persisted to localStorage). The active profile's `countryCode` and `leadTimes` are derived values that replace the old separate `countryCode`/`leadTimeOverrides` state — all downstream consumers (`useHolidays`, `applyLeadTimeOverrides`, URL hash encoding) are unchanged. The gear icon sets `view = 'settings'`; SettingsPage renders when `view === 'settings'` and shows a two-column layout: profile list on the left, process/step editor on the right. Changes are saved explicitly via a Save button.

**Tech Stack:** React 18 useState/useEffect, localStorage, existing `PROCESSES`/`MODIFIERS` from data.js, existing `buildSteps` from utils.js.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/App.jsx` | **Modify** | Remove SettingsModal; replace `countryCode`+`leadTimeOverrides` state with `profiles`+`activeProfileId`; derive countryCode/leadTimeOverrides from active profile; gear icon → `setView('settings')`; render SettingsPage |
| `src/components/SettingsPage.jsx` | **Create** | Full-page settings UI: profile list sidebar + process/step editor |
| `src/components/SettingsModal.jsx` | **Delete** | Replaced by SettingsPage |

---

## Data Shapes

```js
// A profile
{
  id: string,           // 'default' for built-in, or `profile_${Date.now()}` for custom
  name: string,         // display name, e.g., "Ukraine", "Ethiopia"
  countryCode: string,  // ISO 3166-1 alpha-2, e.g., 'UA'
  leadTimes: {
    [procKey]: {        // e.g., 'itb', 'rfq'
      [stepName]: { minDays: number, maxDays: number }
    }
  }
}

// Built-in default (never stored in localStorage, always reconstructed)
const DEFAULT_PROFILE = { id: 'default', name: 'Default', countryCode: 'UA', leadTimes: {} };

// localStorage keys
'procurement_profiles'          // JSON array of custom profiles
'procurement_active_profile_id' // string, e.g., 'default' or 'profile_1714000000000'
```

---

## Country List (reuse in SettingsPage)

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

---

## Task 1: Refactor App.jsx — profile system replaces countryCode + leadTimeOverrides

**Files:**
- Modify: `src/App.jsx`
- Delete: `src/components/SettingsModal.jsx`

**Context:** Currently App.jsx has separate `countryCode` and `leadTimeOverrides` state (lines 708–716), a `showSettings` state (line 721), imports `SettingsModal` (line 7), renders it at the bottom (line 1355), and the gear icon calls `setShowSettings(true)` (line 948). We replace all of this with a profile system.

- [ ] **Step 1: Delete SettingsModal.jsx**

```bash
rm /Users/francesco/Desktop/claude_code_test/procurement_timeline/src/components/SettingsModal.jsx
```

- [ ] **Step 2: Remove SettingsModal import and showSettings state from App.jsx**

Open `src/App.jsx`.

Remove line:
```js
import SettingsModal from "./components/SettingsModal";
```

Remove line:
```js
  const [showSettings, setShowSettings] = useState(false);
```

- [ ] **Step 3: Replace countryCode + leadTimeOverrides state with profiles + activeProfileId**

Find this block (lines ~708–716):
```js
  const [countryCode, setCountryCode] = useState(() => loadLS('procurement_country', 'UA'));
  const [leadTimeOverrides, setLeadTimeOverrides] = useState(() => loadLS('procurement_lead_time_overrides', {}));
  const { holidays, loading: holidaysLoading, error: holidaysError } = useHolidays(countryCode);
  useEffect(() => { saveLS('procurement_country', countryCode); }, [countryCode]);
  useEffect(() => { saveLS('procurement_lead_time_overrides', leadTimeOverrides); }, [leadTimeOverrides]);
```

Replace with:
```js
  const DEFAULT_PROFILE = { id: 'default', name: 'Default', countryCode: 'UA', leadTimes: {} };
  const [profiles, setProfiles] = useState(() => loadLS('procurement_profiles', []));
  const [activeProfileId, setActiveProfileId] = useState(() => loadLS('procurement_active_profile_id', 'default'));
  useEffect(() => { saveLS('procurement_profiles', profiles); }, [profiles]);
  useEffect(() => { saveLS('procurement_active_profile_id', activeProfileId); }, [activeProfileId]);

  const activeProfile = activeProfileId === 'default'
    ? DEFAULT_PROFILE
    : (profiles.find(p => p.id === activeProfileId) ?? DEFAULT_PROFILE);
  const countryCode = activeProfile.countryCode;
  const leadTimeOverrides = activeProfile.leadTimes;

  const { holidays, loading: holidaysLoading, error: holidaysError } = useHolidays(countryCode);
```

- [ ] **Step 4: Update URL hash decode — replace setCountryCode/setLeadTimeOverrides with profile creation**

Find this block (around line 769):
```js
          if (cfg.countryCode) setCountryCode(cfg.countryCode);
          if (cfg.leadTimeOverrides) setLeadTimeOverrides(cfg.leadTimeOverrides);
```

Replace with:
```js
          if (cfg.countryCode || cfg.leadTimeOverrides) {
            const snapshotProfile = {
              id: `profile_${Date.now()}`,
              name: 'From shared link',
              countryCode: cfg.countryCode || 'UA',
              leadTimes: cfg.leadTimeOverrides || {},
            };
            setProfiles(prev => {
              const exists = prev.find(p => p.id === snapshotProfile.id);
              return exists ? prev : [...prev, snapshotProfile];
            });
            setActiveProfileId(snapshotProfile.id);
          }
```

- [ ] **Step 5: Change gear icon to navigate to settings view instead of opening modal**

Find:
```js
                onClick={() => setShowSettings(true)}
```

Replace with:
```js
                onClick={() => setView('settings')}
```

- [ ] **Step 6: Remove SettingsModal render from JSX**

Find and remove this entire block (around line 1355):
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

- [ ] **Step 7: Add SettingsPage import**

Find:
```js
import StepEditor from "./components/StepEditor";
```

Add after it:
```js
import SettingsPage from "./components/SettingsPage";
```

- [ ] **Step 8: Add SettingsPage render when view === 'settings'**

Find where the main app content renders. Look for where `view === "overview"` and `view === "timeline"` are checked (around line 1298). Add the settings view at the very start of the outermost returned div — before any other content, as a full-page takeover:

Find the opening of the main return's outermost wrapper. It should look something like:
```jsx
  return (
    <div className="app" ...>
```

Right after that opening tag, add:
```jsx
      {view === 'settings' && (
        <SettingsPage
          profiles={profiles}
          activeProfileId={activeProfileId}
          defaultProfile={DEFAULT_PROFILE}
          onSaveProfile={(profile) => {
            setProfiles(prev => {
              const idx = prev.findIndex(p => p.id === profile.id);
              return idx >= 0 ? prev.map(p => p.id === profile.id ? profile : p) : [...prev, profile];
            });
            setActiveProfileId(profile.id);
          }}
          onDeleteProfile={(id) => {
            setProfiles(prev => prev.filter(p => p.id !== id));
            if (activeProfileId === id) setActiveProfileId('default');
          }}
          onActivateProfile={(id) => setActiveProfileId(id)}
          onBack={() => setView('overview')}
        />
      )}
      {view !== 'settings' && (
```

Then find the very last closing `</div>` of the return and add `)}` before it to close the `{view !== 'settings' && (` wrapper.

- [ ] **Step 9: Build and test**

```bash
npm run build 2>&1 | tail -10
npm test 2>&1 | tail -6
```

Expected: build succeeds (will warn about missing SettingsPage — that's OK until Task 2). All tests pass.

- [ ] **Step 10: Commit**

```bash
git add src/App.jsx
git rm src/components/SettingsModal.jsx
git commit -m "refactor: replace SettingsModal with profile-based settings system in App.jsx"
```

---

## Task 2: Create SettingsPage component

**Files:**
- Create: `src/components/SettingsPage.jsx`

**Context:** Full-page settings UI. Left column: profile list. Right column: editor for the selected profile (name, country, all 9 processes with step day inputs). Default profile is read-only. Save button commits to parent via `onSaveProfile`. The 9 process keys are: `very_low`, `micro`, `rfq`, `itb`, `itb_works`, `rfp`, `lta_fixed`, `lta_mini`, `direct_procurement`.

- [ ] **Step 1: Create src/components/SettingsPage.jsx**

```jsx
import { useState } from "react";
import { PROCESSES, MODIFIERS } from "../data";
import { buildSteps } from "../utils";

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

const PROC_KEYS = Object.keys(PROCESSES);

function buildDraftLeadTimes(profile) {
  // Build a complete draft: for every process and every step, fill in current override or default
  const draft = {};
  PROC_KEYS.forEach(procKey => {
    const baseSteps = buildSteps(procKey, [], PROCESSES, MODIFIERS);
    draft[procKey] = {};
    baseSteps.forEach(s => {
      const override = profile.leadTimes?.[procKey]?.[s.name];
      draft[procKey][s.name] = {
        minDays: String(override?.minDays ?? s.minDays),
        maxDays: String(override?.maxDays ?? s.maxDays),
        defaultMin: s.minDays,
        defaultMax: s.maxDays,
      };
    });
  });
  return draft;
}

function draftToLeadTimes(draft) {
  // Convert draft back to leadTimes, omitting entries that match defaults
  const leadTimes = {};
  PROC_KEYS.forEach(procKey => {
    const procEntry = {};
    let hasOverride = false;
    Object.entries(draft[procKey] || {}).forEach(([stepName, d]) => {
      const min = parseInt(d.minDays, 10);
      const max = parseInt(d.maxDays, 10);
      if (!isNaN(min) && !isNaN(max) && min >= 1 && max >= min) {
        if (min !== d.defaultMin || max !== d.defaultMax) {
          procEntry[stepName] = { minDays: min, maxDays: max };
          hasOverride = true;
        }
      }
    });
    if (hasOverride) leadTimes[procKey] = procEntry;
  });
  return leadTimes;
}

function ProcessEditor({ procKey, draft, onDraftChange, isReadOnly }) {
  const [expanded, setExpanded] = useState(false);
  const proc = PROCESSES[procKey];
  const baseSteps = buildSteps(procKey, [], PROCESSES, MODIFIERS);
  const procDraft = draft[procKey] || {};
  const hasOverride = Object.values(procDraft).some(d => {
    const min = parseInt(d.minDays, 10);
    const max = parseInt(d.maxDays, 10);
    return min !== d.defaultMin || max !== d.defaultMax;
  });

  return (
    <div style={{ border: '1px solid #e8e8e8', borderRadius: 8, marginBottom: 8, overflow: 'hidden' }}>
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px', background: hasOverride ? '#fffbe6' : '#fafafa',
          border: 'none', cursor: 'pointer', fontSize: 13, textAlign: 'left',
        }}
      >
        <span>
          <span style={{ fontWeight: 700, color: proc.color }}>{proc.label}</span>
          <span style={{ fontSize: 11, color: '#888', marginLeft: 8 }}>{proc.threshold}</span>
          {hasOverride && <span style={{ fontSize: 10, color: '#b7770d', marginLeft: 6, fontWeight: 600 }}>modified</span>}
        </span>
        <span style={{ color: '#999', fontSize: 12 }}>{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th style={{ textAlign: 'left', padding: '6px 14px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#888' }}>Step</th>
              <th style={{ textAlign: 'left', padding: '6px 8px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#888' }}>Owner</th>
              <th style={{ textAlign: 'center', padding: '6px 8px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#888', width: 80 }}>Min days</th>
              <th style={{ textAlign: 'center', padding: '6px 8px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#888', width: 80 }}>Max days</th>
            </tr>
          </thead>
          <tbody>
            {baseSteps.map((s, i) => {
              const d = procDraft[s.name] || { minDays: String(s.minDays), maxDays: String(s.maxDays), defaultMin: s.minDays, defaultMax: s.maxDays };
              const modified = parseInt(d.minDays, 10) !== d.defaultMin || parseInt(d.maxDays, 10) !== d.defaultMax;
              return (
                <tr key={i} style={{ borderTop: '1px solid #f0f0f0', background: modified ? '#fffbe6' : 'transparent' }}>
                  <td style={{ padding: '6px 14px', color: '#333' }}>
                    {s.name}
                    {modified && <span style={{ fontSize: 10, color: '#b7770d', marginLeft: 5 }}>modified</span>}
                  </td>
                  <td style={{ padding: '6px 8px', color: '#666', fontSize: 12 }}>{s.owner}</td>
                  <td style={{ padding: '4px 8px' }}>
                    {isReadOnly ? (
                      <div style={{ textAlign: 'center', color: '#555' }}>{s.minDays}</div>
                    ) : (
                      <input
                        type="number" min="1"
                        value={d.minDays}
                        onChange={e => onDraftChange(procKey, s.name, 'minDays', e.target.value)}
                        style={{ width: '100%', border: '1px solid #ccc', borderRadius: 4, padding: '3px 6px', fontSize: 13, textAlign: 'center', background: modified ? '#fffbe6' : '#fff' }}
                      />
                    )}
                  </td>
                  <td style={{ padding: '4px 8px' }}>
                    {isReadOnly ? (
                      <div style={{ textAlign: 'center', color: '#555' }}>{s.maxDays}</div>
                    ) : (
                      <input
                        type="number" min="1"
                        value={d.maxDays}
                        onChange={e => onDraftChange(procKey, s.name, 'maxDays', e.target.value)}
                        style={{ width: '100%', border: '1px solid #ccc', borderRadius: 4, padding: '3px 6px', fontSize: 13, textAlign: 'center', background: modified ? '#fffbe6' : '#fff' }}
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function SettingsPage({ profiles, activeProfileId, defaultProfile, onSaveProfile, onDeleteProfile, onActivateProfile, onBack }) {
  const allProfiles = [defaultProfile, ...profiles];
  const [selectedId, setSelectedId] = useState(activeProfileId);
  const selectedProfile = allProfiles.find(p => p.id === selectedId) || defaultProfile;
  const isDefault = selectedProfile.id === 'default';

  const [draftName, setDraftName] = useState(selectedProfile.name);
  const [draftCountry, setDraftCountry] = useState(selectedProfile.countryCode);
  const [draftLeadTimes, setDraftLeadTimes] = useState(() => buildDraftLeadTimes(selectedProfile));
  const [saved, setSaved] = useState(false);

  function selectProfile(profile) {
    setSelectedId(profile.id);
    setDraftName(profile.name);
    setDraftCountry(profile.countryCode);
    setDraftLeadTimes(buildDraftLeadTimes(profile));
    setSaved(false);
  }

  function handleDraftChange(procKey, stepName, field, value) {
    setDraftLeadTimes(prev => ({
      ...prev,
      [procKey]: {
        ...prev[procKey],
        [stepName]: { ...prev[procKey][stepName], [field]: value },
      },
    }));
  }

  function handleSave() {
    if (isDefault) return;
    const updated = {
      ...selectedProfile,
      name: draftName.trim() || selectedProfile.name,
      countryCode: draftCountry,
      leadTimes: draftToLeadTimes(draftLeadTimes),
    };
    onSaveProfile(updated);
    onActivateProfile(updated.id);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleNewProfile() {
    const newProfile = {
      id: `profile_${Date.now()}`,
      name: 'New Profile',
      countryCode: 'UA',
      leadTimes: {},
    };
    onSaveProfile(newProfile);
    selectProfile(newProfile);
  }

  function handleDelete() {
    if (isDefault) return;
    onDeleteProfile(selectedProfile.id);
    selectProfile(defaultProfile);
  }

  function handleResetProcess(procKey) {
    setDraftLeadTimes(prev => {
      const baseSteps = buildSteps(procKey, [], PROCESSES, MODIFIERS);
      const reset = {};
      baseSteps.forEach(s => {
        reset[s.name] = { minDays: String(s.minDays), maxDays: String(s.maxDays), defaultMin: s.minDays, defaultMax: s.maxDays };
      });
      return { ...prev, [procKey]: reset };
    });
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f4f6f8', fontFamily: 'var(--font-body)' }}>
      {/* Header */}
      <div style={{ background: '#1a5276', color: '#fff', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <button
          onClick={onBack}
          style={{ background: 'none', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 6, color: '#fff', padding: '5px 12px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
        >
          ← Back to app
        </button>
        <div style={{ fontWeight: 700, fontSize: 18 }}>⚙️ Settings — Lead Time Profiles</div>
      </div>

      <div style={{ display: 'flex', maxWidth: 1100, margin: '0 auto', padding: 24, gap: 24, alignItems: 'flex-start' }}>

        {/* Left sidebar: profile list */}
        <div style={{ width: 220, flexShrink: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#888', marginBottom: 10 }}>Profiles</div>
          {allProfiles.map(profile => {
            const isActive = profile.id === activeProfileId;
            const isSelected = profile.id === selectedId;
            return (
              <button
                key={profile.id}
                onClick={() => selectProfile(profile)}
                style={{
                  width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 8,
                  border: isSelected ? '2px solid #1a5276' : '2px solid transparent',
                  background: isSelected ? '#eaf0f6' : '#fff',
                  cursor: 'pointer', marginBottom: 6, fontSize: 13,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: isSelected ? 700 : 500, color: '#222' }}>{profile.name}</span>
                  {isActive && <span style={{ fontSize: 11, background: '#1a5276', color: '#fff', borderRadius: 10, padding: '1px 7px', fontWeight: 700 }}>active</span>}
                </div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{profile.countryCode} · {profile.id === 'default' ? 'built-in' : 'custom'}</div>
              </button>
            );
          })}
          <button
            onClick={handleNewProfile}
            style={{
              width: '100%', padding: '8px 12px', borderRadius: 8, border: '2px dashed #ccc',
              background: 'none', cursor: 'pointer', fontSize: 13, color: '#555',
              marginTop: 4, fontWeight: 600,
            }}
          >
            + New profile
          </button>
        </div>

        {/* Right panel: profile editor */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Profile header */}
          <div style={{ background: '#fff', borderRadius: 10, padding: '18px 20px', marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#888', display: 'block', marginBottom: 5 }}>Profile name</label>
                {isDefault ? (
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#333', padding: '6px 0' }}>Default</div>
                ) : (
                  <input
                    value={draftName}
                    onChange={e => setDraftName(e.target.value)}
                    style={{ width: '100%', border: '1.5px solid #ddd', borderRadius: 6, padding: '7px 10px', fontSize: 14, fontWeight: 600 }}
                  />
                )}
              </div>
              <div style={{ minWidth: 200 }}>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#888', display: 'block', marginBottom: 5 }}>Country / Holidays</label>
                {isDefault ? (
                  <div style={{ fontSize: 14, color: '#555', padding: '6px 0' }}>Ukraine (UA) — built-in</div>
                ) : (
                  <select
                    value={draftCountry}
                    onChange={e => setDraftCountry(e.target.value)}
                    style={{ border: '1.5px solid #ddd', borderRadius: 6, padding: '7px 10px', fontSize: 13, width: '100%' }}
                  >
                    {COUNTRY_LIST.map(c => (
                      <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
                    ))}
                  </select>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, alignSelf: 'flex-end', paddingBottom: 2 }}>
                {!isDefault && (
                  <>
                    <button
                      onClick={handleSave}
                      style={{ padding: '8px 20px', borderRadius: 6, border: 'none', background: '#1a5276', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                    >
                      {saved ? '✓ Saved & active' : 'Save & activate'}
                    </button>
                    <button
                      onClick={handleDelete}
                      style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid #e0e0e0', background: '#fff', color: '#c0392b', fontSize: 13, cursor: 'pointer' }}
                    >
                      Delete
                    </button>
                  </>
                )}
                {isDefault && (
                  <button
                    onClick={() => { onActivateProfile('default'); }}
                    disabled={activeProfileId === 'default'}
                    style={{
                      padding: '8px 20px', borderRadius: 6, border: 'none',
                      background: activeProfileId === 'default' ? '#ccc' : '#1a5276',
                      color: '#fff', fontWeight: 700, fontSize: 13,
                      cursor: activeProfileId === 'default' ? 'default' : 'pointer',
                    }}
                  >
                    {activeProfileId === 'default' ? '✓ Active' : 'Activate'}
                  </button>
                )}
              </div>
            </div>
            {isDefault && (
              <div style={{ marginTop: 10, fontSize: 12, color: '#888', borderTop: '1px solid #f0f0f0', paddingTop: 10 }}>
                The Default profile uses the built-in FAO Ukraine lead times and cannot be edited. Create a new profile to customize.
              </div>
            )}
          </div>

          {/* Process list */}
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#888', marginBottom: 10 }}>
            Solicitation Methods — Lead Times
          </div>
          {PROC_KEYS.map(procKey => (
            <ProcessEditor
              key={procKey}
              procKey={procKey}
              draft={draftLeadTimes}
              onDraftChange={handleDraftChange}
              isReadOnly={isDefault}
            />
          ))}
          {!isDefault && (
            <div style={{ marginTop: 8, fontSize: 12, color: '#888' }}>
              Click "Save &amp; activate" above to apply your changes. Modified steps are highlighted.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run build**

```bash
npm run build 2>&1 | tail -10
```

Expected: `✓ built in ...` — no errors.

- [ ] **Step 3: Run tests**

```bash
npm test 2>&1 | tail -6
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/SettingsPage.jsx
git commit -m "feat: add SettingsPage component with profile list and process step editor"
```

---

## Task 3: Worktree cleanup + final verification

**Files:** None — verification only.

- [ ] **Step 1: Start dev server and smoke test**

```bash
npm run dev -- --port 5175 &
sleep 2 && echo "ready"
```

Verify in browser (http://localhost:5175/):
1. ⚙️ gear icon in header navigates to Settings page
2. Settings page shows "Default" profile in sidebar (active, read-only)
3. Each process row is collapsible → shows steps with default day values (read-only)
4. "+ New profile" creates a profile, loads it in editor
5. Name and country are editable on the new profile
6. Step day inputs are editable; modified steps highlighted yellow
7. "Save & activate" saves and marks profile active; header shows new country holidays
8. "← Back to app" returns to the timeline
9. Kill the server: `pkill -f "vite --port"`

- [ ] **Step 2: Run full test suite**

```bash
npm test 2>&1 | tail -6
```

Expected: all tests pass.

- [ ] **Step 3: Commit if any fixes were needed, then clean up**

```bash
git add -A && git commit -m "fix: settings page smoke test fixes" 2>/dev/null || echo "no fixes needed"
```

---

## Self-Review

### Spec Coverage
| Requirement | Task |
|---|---|
| Settings as full page (not modal) | Task 1 Step 5+8 (gear → setView, SettingsPage render) |
| ← Back button | Task 2 (SettingsPage header button → onBack) |
| List of all solicitation methods | Task 2 (PROC_KEYS.map → ProcessEditor) |
| Hardcoded default values shown | Task 2 (buildDraftLeadTimes uses buildSteps defaults) |
| Editable step days | Task 2 (ProcessEditor inputs, read-only for Default) |
| Changes reflected in app on Save | Task 1 onSaveProfile + onActivateProfile |
| Named profiles (save/load) | Task 2 (profile list sidebar) |
| One active profile at a time | Task 1 (activeProfileId state; onActivateProfile) |
| Default profile always present, read-only | Task 2 (isDefault guard, "Activate" button only) |
| Country/holiday selector per profile | Task 2 (draftCountry select) |
| URL hash: active profile settings encoded | Task 1 Step 4 (countryCode+leadTimeOverrides derived, encoded same way in currentPlanConfig) |

### Placeholder Scan
All steps contain complete code. No TBDs.

### Type Consistency
- `profiles`: `Array<{id, name, countryCode, leadTimes}>` — consistent across App.jsx state, SettingsPage props, onSaveProfile callback.
- `activeProfileId`: `string` — consistent throughout.
- `draftLeadTimes[procKey][stepName]`: `{minDays: string, maxDays: string, defaultMin: number, defaultMax: number}` — consistent between `buildDraftLeadTimes`, `handleDraftChange`, and `draftToLeadTimes`.
- `DEFAULT_PROFILE` is defined in App.jsx and passed as `defaultProfile` prop to SettingsPage — consistent usage.

import { useState, useEffect } from "react";
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

  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), 2000);
    return () => clearTimeout(timer);
  }, [saved]);

  useEffect(() => {
    const profile = allProfiles.find(p => p.id === selectedId) || defaultProfile;
    setDraftName(profile.name);
    setDraftCountry(profile.countryCode);
    setDraftLeadTimes(buildDraftLeadTimes(profile));
  }, [selectedId]);

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
    const currentProfile = allProfiles.find(p => p.id === selectedId) || defaultProfile;
    const updated = {
      ...currentProfile,
      name: draftName.trim() || currentProfile.name,
      countryCode: draftCountry,
      leadTimes: draftToLeadTimes(draftLeadTimes),
    };
    onSaveProfile(updated);
    onActivateProfile(updated.id);
    setSaved(true);
  }

  function handleNewProfile() {
    const newProfile = {
      id: `profile_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
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
                    onClick={() => onActivateProfile('default')}
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

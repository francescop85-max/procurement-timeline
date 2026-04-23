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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #eee' }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>⚙️ Settings</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#888', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid #eee' }}>
          <button style={tabBtnStyle(tab === 'calendar')} onClick={() => setTab('calendar')}>Calendar & Holidays</button>
          <button style={tabBtnStyle(tab === 'leadtimes')} onClick={() => setTab('leadtimes')}>Lead Times</button>
        </div>

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

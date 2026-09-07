import { useState } from 'react';
import { LOA_PROCESSES } from './data.js';
import { formatDate } from './utils.js';

const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };

function stepStatus(step) {
  const now = today();
  const minStart = new Date(step.minStart);
  const minEnd = new Date(step.minEnd);
  const maxEnd = new Date(step.maxEnd);

  if (step.actualDate) {
    const actual = new Date(step.actualDate);
    return actual <= maxEnd ? 'done' : 'done_late';
  }
  if (now < minStart) return 'upcoming';
  if (now <= minEnd) return 'on_track';
  if (now <= maxEnd) return 'at_risk';
  return 'overdue';
}

const STATUS_META = {
  done:      { label: 'Done ✓',     bg: '#e8f5e9', color: '#2e7d32', border: '#a5d6a7' },
  done_late: { label: 'Done Late',  bg: '#fff3e0', color: '#e65100', border: '#ffcc80' },
  upcoming:  { label: 'Upcoming',   bg: '#f5f5f5', color: '#757575', border: '#e0e0e0' },
  on_track:  { label: 'On Track',   bg: '#e8f5e9', color: '#2e7d32', border: '#a5d6a7' },
  at_risk:   { label: 'At Risk',    bg: '#fff3e0', color: '#e65100', border: '#ffcc80' },
  overdue:   { label: 'Overdue',    bg: '#ffebee', color: '#c62828', border: '#ef9a9a' },
};

function StatusBadge({ status }) {
  const m = STATUS_META[status];
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700,
      background: m.bg, color: m.color, border: `1px solid ${m.border}`,
    }}>
      {m.label}
    </span>
  );
}

export default function LoaMonitor({ plan, onSave }) {
  const proc = LOA_PROCESSES[plan.processType];
  const [steps, setSteps] = useState(plan.steps ?? []);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function handleActualChange(index, value) {
    setSteps(prev => prev.map((s, i) => i === index ? { ...s, actualDate: value || undefined } : s));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    await onSave({ ...plan, steps, updatedAt: new Date().toISOString() });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const overallDone = steps.length > 0 && steps.every(s => s.actualDate);
  const anyChanged = steps.some((s, i) => s.actualDate !== plan.steps[i]?.actualDate);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>

      {/* Plan header */}
      <div style={{ background: '#fff', borderRadius: 10, padding: '16px 20px', marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: proc?.color ?? '#888', display: 'inline-block' }} />
              <span style={{ fontWeight: 700, fontSize: 18, color: '#1a2e44' }}>{plan.name}</span>
              {overallDone && (
                <span style={{ fontSize: 11, background: '#e8f5e9', color: '#2e7d32', border: '1px solid #a5d6a7', borderRadius: 10, padding: '2px 8px', fontWeight: 700 }}>
                  All steps completed
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: '#888' }}>{proc?.label ?? plan.processType}</div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
              Value: ${Number(plan.value).toLocaleString()} · Start: {formatDate(new Date(plan.startDate))}
            </div>
          </div>
          <div style={{ background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 8, padding: '8px 14px', fontSize: 11, color: '#795548', flexShrink: 0, maxWidth: 220 }}>
            <strong>Monitoring view</strong><br />
            Enter actual completion dates for each step. Status updates automatically.
          </div>
        </div>
      </div>

      {/* Steps table */}
      <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f4f6f8' }}>
                <th style={th}>#</th>
                <th style={{ ...th, textAlign: 'left' }}>Step</th>
                <th style={{ ...th, textAlign: 'right', whiteSpace: 'nowrap' }}>Planned start</th>
                <th style={{ ...th, textAlign: 'right', whiteSpace: 'nowrap' }}>Planned end</th>
                <th style={{ ...th, textAlign: 'center', whiteSpace: 'nowrap' }}>Actual date</th>
                <th style={{ ...th, textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {steps.map((step, i) => {
                const status = stepStatus(step);
                const isLate = status === 'overdue' || status === 'done_late' || status === 'at_risk';
                return (
                  <tr key={step.id || i} style={{ borderBottom: '1px solid #f0f0f0', background: step.actualDate ? '#fafff9' : 'transparent' }}>
                    <td style={{ ...td, color: '#888', fontWeight: 600 }}>{i + 1}</td>
                    <td style={{ ...td, color: isLate && !step.actualDate ? '#b71c1c' : '#222', fontWeight: isLate && !step.actualDate ? 600 : 400 }}>
                      {step.name}
                    </td>
                    <td style={{ ...td, textAlign: 'right', color: '#555', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                      {formatDate(step.minStart)}
                    </td>
                    <td style={{ ...td, textAlign: 'right', color: proc?.color ?? '#555', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600 }}>
                      {formatDate(step.maxEnd)}
                    </td>
                    <td style={{ ...td, textAlign: 'center' }}>
                      <input
                        type="date"
                        value={step.actualDate ? step.actualDate.slice(0, 10) : ''}
                        onChange={e => handleActualChange(i, e.target.value)}
                        style={{
                          fontSize: 11, border: '1px solid #ddd', borderRadius: 5, padding: '3px 6px',
                          fontFamily: 'var(--font-mono)', color: '#333', background: step.actualDate ? '#f0fff4' : '#fff',
                          cursor: 'pointer',
                        }}
                      />
                    </td>
                    <td style={{ ...td, textAlign: 'center' }}>
                      <StatusBadge status={status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ padding: '14px 20px', borderTop: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
          {saved && <span style={{ fontSize: 12, color: '#2e7d32', fontWeight: 600 }}>✓ Saved</span>}
          <button
            onClick={handleSave}
            disabled={saving || !anyChanged}
            style={{
              fontSize: 12, padding: '6px 16px', borderRadius: 6, fontWeight: 700, cursor: anyChanged ? 'pointer' : 'default',
              background: anyChanged ? '#1a2e44' : '#e0e0e0', color: anyChanged ? '#fff' : '#aaa', border: 'none',
              transition: 'all 0.2s',
            }}
          >
            {saving ? 'Saving…' : 'Save actuals'}
          </button>
        </div>
      </div>
    </div>
  );
}

const th = {
  padding: '8px 10px', fontWeight: 700, color: '#555',
  borderBottom: '1px solid #e8e8e8', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.3px',
};
const td = { padding: '8px 10px' };

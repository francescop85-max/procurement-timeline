import { useState, useEffect } from 'react';
import { LOA_PROCESSES, LOA_DEFAULTS, loadLoaSettings, getEffectiveSteps } from './data.js';
import { computeLoaTimeline, formatDate } from './utils.js';
import { useHolidays } from '../hooks/useHolidays.js';

const PROCESS_OPTIONS = Object.entries(LOA_PROCESSES).map(([key, p]) => ({ key, label: p.label }));

const EMPTY_FORM = {
  name: '',
  processType: 'direct',
  value: '',
  startDate: '',
};

export default function LoaPanel({ plan, onSave, onClose }) {
  const { holidays } = useHolidays();
  const [form, setForm] = useState(EMPTY_FORM);
  const [preview, setPreview] = useState(null);
  const [valueError, setValueError] = useState(null);

  useEffect(() => {
    if (plan) {
      setForm({
        name: plan.name || '',
        processType: plan.processType || 'direct',
        value: plan.value != null ? String(plan.value) : '',
        startDate: plan.startDate || '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [plan]);

  useEffect(() => {
    const settings = loadLoaSettings();
    const authorityLimit = settings?.authorityLimit ?? LOA_DEFAULTS.authorityLimit;
    const v = Number(form.value);

    if (form.value && v > authorityLimit) {
      setValueError(`⚠️ LoA value exceeds FAO Ukraine delegated authority of $${authorityLimit.toLocaleString()}. This tool is for LoAs within the delegated authority. Please submit to CSLP/LOA Unit for LoAs above this amount.`);
      setPreview(null);
      return;
    }
    setValueError(null);

    if (!form.startDate || !form.processType || !form.value) {
      setPreview(null);
      return;
    }

    const steps = getEffectiveSteps(form.processType, v, settings);
    if (!steps.length) { setPreview(null); return; }

    try {
      const timeline = computeLoaTimeline(steps, form.startDate, holidays);
      setPreview(timeline);
    } catch {
      setPreview(null);
    }
  }, [form.processType, form.value, form.startDate, holidays]);

  function set(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    if (!form.name.trim() || !form.startDate || !form.processType || !form.value || valueError) return;
    const settings = loadLoaSettings();
    const steps = getEffectiveSteps(form.processType, Number(form.value), settings);
    const timeline = computeLoaTimeline(steps, form.startDate, holidays);
    onSave({
      id: plan?.id || crypto.randomUUID(),
      name: form.name.trim(),
      processType: form.processType,
      value: Number(form.value),
      startDate: form.startDate,
      steps: timeline,
      createdAt: plan?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  const lastStep = preview?.[preview.length - 1];
  const proc = LOA_PROCESSES[form.processType];

  return (
    <div className="planner-panel">
      <div className="planner-panel-title">{plan ? 'Edit LOA Plan' : 'New LOA Plan'}</div>

      <div className="panel-field">
        <div className="panel-label">Plan Name</div>
        <input className="panel-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Seeds distribution — NGO Name" />
      </div>

      <div className="panel-field">
        <div className="panel-label">Process Type</div>
        <select className="panel-input" value={form.processType} onChange={e => set('processType', e.target.value)}>
          {PROCESS_OPTIONS.map(o => (
            <option key={o.key} value={o.key}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="panel-field">
        <div className="panel-label">LoA Value (USD)</div>
        <input
          className="panel-input"
          type="number"
          min="0"
          value={form.value}
          onChange={e => set('value', e.target.value)}
          placeholder="e.g. 45000"
        />
        {valueError && (
          <div style={{ marginTop: 8, padding: '8px 10px', background: '#fff3e0', border: '1px solid #ffb74d', borderRadius: 6, fontSize: 12, color: '#e65100', lineHeight: 1.5 }}>
            {valueError}
          </div>
        )}
        {form.value && !valueError && Number(form.value) > (loadLoaSettings()?.lpcThreshold ?? LOA_DEFAULTS.lpcThreshold) && (
          <div style={{ marginTop: 6, fontSize: 11, color: '#1558a0', background: '#e3f2fd', borderRadius: 5, padding: '5px 8px' }}>
            LPC steps included (value &gt; ${(loadLoaSettings()?.lpcThreshold ?? LOA_DEFAULTS.lpcThreshold).toLocaleString()})
          </div>
        )}
      </div>

      <div className="panel-field">
        <div className="panel-label">Start Date</div>
        <input className="panel-input" type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
      </div>

      {preview && lastStep && (
        <div className="deadline-box">
          <div className="deadline-box-title">Estimated Timeline</div>
          <div className="deadline-row">
            <span>Steps:</span>
            <span>{preview.length}</span>
          </div>
          <div className="deadline-row">
            <span>Earliest effective:</span>
            <span>{formatDate(lastStep.minEnd)}</span>
          </div>
          <div className="deadline-row">
            <span>Latest effective:</span>
            <span style={{ color: '#e65100', fontWeight: 700 }}>{formatDate(lastStep.maxEnd)}</span>
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: '#888' }}>
            Total: {preview.reduce((s, st) => s + st.minDays, 0)}–{preview.reduce((s, st) => s + st.maxDays, 0)} working days
          </div>
        </div>
      )}

      <button
        className="panel-save-btn"
        onClick={handleSave}
        disabled={!form.name.trim() || !form.startDate || !form.processType || !form.value || !!valueError}
      >
        {plan ? 'Save Changes' : 'Create Plan'}
      </button>
    </div>
  );
}

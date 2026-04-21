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
        <div className="panel-label">Target Planting / Delivery Date</div>
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

      <div className="panel-field">
        <div className="panel-label">Custom Step (optional)</div>
        <input className="panel-input" style={{ marginBottom: 5 }} placeholder="Step label" value={form.customModifier.label} onChange={e => set('customModifier', { ...form.customModifier, label: e.target.value })} />
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input className="panel-input" type="number" min="1" style={{ width: 70 }} placeholder="Days" value={form.customModifier.days} onChange={e => set('customModifier', { ...form.customModifier, days: e.target.value })} />
          <span style={{ fontSize: 11, color: '#888' }}>working days (inserted before final step)</span>
        </div>
      </div>

      <div className="panel-field">
        <div className="panel-label">Remarks / Notes</div>
        <textarea className="panel-input" rows={3} value={form.remarks} onChange={e => set('remarks', e.target.value)} placeholder="Optional notes…" style={{ resize: 'vertical' }} />
      </div>

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

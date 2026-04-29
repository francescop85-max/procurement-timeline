// src/planner/PlannerApp.jsx
import { useState } from 'react';
import { useHolidays } from '../hooks/useHolidays.js';
import { useCampaigns } from './useCampaigns.js';
import { PROCESSES, MODIFIERS, DEFAULT_PROFILE } from '../data.js';
import { computeBackwardTimeline, computeCampaignStatus, computeProjectStatuses } from '../utils.js';
import PlannerTimeline from './PlannerTimeline.jsx';
import CampaignTable from './CampaignTable.jsx';
import CampaignPanel from './CampaignPanel.jsx';

function loadLS(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}

export default function PlannerApp() {
  const { holidays } = useHolidays();
  const { campaigns, saveCampaign, deleteCampaign } = useCampaigns();

  // null = overview; string id = detail view for that campaign
  const [selectedId, setSelectedId] = useState(null);
  // null = panel closed; 'add' = new; campaign object = edit mode
  const [panelMode, setPanelMode] = useState(null);
  const [liveSteps, setLiveSteps] = useState(null);

  // Profile selection
  const [profiles] = useState(() => {
    const custom = loadLS('procurement_profiles', []);
    const defaultOverride = loadLS('procurement_default_override', null);
    return [defaultOverride ?? DEFAULT_PROFILE, ...custom];
  });
  const [selectedProfileId, setSelectedProfileId] = useState(
    () => loadLS('procurement_active_profile_id', 'default')
  );
  const selectedProfile = profiles.find(p => p.id === selectedProfileId) ?? profiles[0];

  const selectedCampaign = selectedId ? campaigns.find(c => c.id === selectedId) : null;

  function handleAddClick() {
    setPanelMode('add');
  }

  function handleEditClick(campaign) {
    setPanelMode(campaign);
  }

  async function handleUpdateSteps(campaignId, updatedSteps) {
    const base = campaigns.find(c => c.id === campaignId);
    if (!base) return;
    await saveCampaign({ ...base, steps: updatedSteps, updatedAt: new Date().toISOString() });
  }

  async function handleDeleteClick(id) {
    if (!window.confirm('Remove this campaign?')) return;
    await deleteCampaign(id);
    if (selectedId === id) setSelectedId(null);
  }

  async function handlePanelSave(formData) {
    const baseSteps = selectedProfile.processSteps?.[formData.selectedMethod] ?? null;
    const timeline = computeBackwardTimeline(
      formData.plantingDate,
      formData.selectedMethod,
      formData.activeMods,
      formData.customModifier,
      formData.deliveryWeeks,
      holidays,
      PROCESSES,
      MODIFIERS,
      baseSteps,
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
      profileId: selectedProfile.id,
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
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Profile selector */}
          {profiles.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Profile:</span>
              <select
                value={selectedProfileId}
                onChange={e => setSelectedProfileId(e.target.value)}
                style={{ fontSize: 12, borderRadius: 5, border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.15)', color: '#fff', padding: '4px 8px', cursor: 'pointer' }}
              >
                {profiles.map(p => (
                  <option key={p.id} value={p.id} style={{ color: '#333', background: '#fff' }}>{p.name}</option>
                ))}
              </select>
            </div>
          )}
          <button
            className="planner-print-btn"
            onClick={() => window.print()}
          >
            🖨 Print / PDF
          </button>
          <a href="/" className="planner-header-back">← Procurement Timeline</a>
        </div>
      </div>

      {/* Timeline */}
      <PlannerTimeline
        campaigns={enriched}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onUpdateSteps={handleUpdateSteps}
        onDragUpdate={setLiveSteps}
      />

      {/* Table */}
      <CampaignTable
        campaigns={enriched}
        selectedId={selectedId}
        liveSteps={liveSteps}
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
            profile={selectedProfile}
            holidays={holidays}
            onSave={handlePanelSave}
            onClose={() => setPanelMode(null)}
          />
        </>
      )}
    </div>
  );
}

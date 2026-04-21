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
  const [liveSteps, setLiveSteps] = useState(null);

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
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
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
            holidays={holidays}
            onSave={handlePanelSave}
            onClose={() => setPanelMode(null)}
          />
        </>
      )}
    </div>
  );
}

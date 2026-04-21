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

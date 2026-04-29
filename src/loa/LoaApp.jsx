import { useState } from 'react';
import { useLoaPlans } from './useLoaPlans.js';
import { LOA_PROCESSES } from './data.js';
import { computeLoaStatus, recomputeStepsFrom, formatDate } from './utils.js';
import { useHolidays } from '../hooks/useHolidays.js';
import LoaPanel from './LoaPanel.jsx';
import LoaGantt from './LoaGantt.jsx';

const STATUS_COLORS = { on_track: '#4CAF50', at_risk: '#FF9800', overdue: '#e53935', unknown: '#bbb' };
const STATUS_LABELS = { on_track: 'On track', at_risk: 'At risk', overdue: 'Overdue', unknown: '—' };

function StatusBadge({ status }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700,
      background: STATUS_COLORS[status] + '22', color: STATUS_COLORS[status], border: `1px solid ${STATUS_COLORS[status]}44`,
    }}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export default function LoaApp() {
  const { plans, loading, savePlan, deletePlan } = useLoaPlans();
  const { holidays } = useHolidays();
  const [selectedId, setSelectedId] = useState(null);
  const [panelMode, setPanelMode] = useState(null);
  const [activeTab, setActiveTab] = useState('table');

  const selectedPlan = selectedId ? plans.find(p => p.id === selectedId) : null;
  const proc = selectedPlan ? LOA_PROCESSES[selectedPlan.processType] : null;

  async function handleDelete(id) {
    if (!window.confirm('Remove this LOA plan?')) return;
    await deletePlan(id);
    if (selectedId === id) setSelectedId(null);
  }

  async function handlePanelSave(planData) {
    await savePlan(planData);
    setSelectedId(planData.id);
    setPanelMode(null);
  }

  // Drag: preview=true returns new steps without saving; preview=false persists
  function handleStepDrag(stepIndex, newMinStart, preview) {
    if (!selectedPlan) return null;
    const newSteps = recomputeStepsFrom(selectedPlan.steps, stepIndex, newMinStart, holidays);
    if (preview) return newSteps;
    savePlan({ ...selectedPlan, steps: newSteps, updatedAt: new Date().toISOString() });
    return newSteps;
  }

  const enriched = plans.map(p => ({ ...p, status: computeLoaStatus(p) }));
  const lastStep = selectedPlan?.steps?.[selectedPlan.steps.length - 1];

  // Feasibility
  let feasibility = null;
  if (selectedPlan?.desiredSigningDate && lastStep) {
    const target = new Date(selectedPlan.desiredSigningDate);
    target.setHours(0, 0, 0, 0);
    const worstEnd = new Date(lastStep.maxEnd);
    feasibility = worstEnd > target ? 'infeasible' : 'ok';
  }

  const tabStyle = (tab) => ({
    padding: '6px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
    borderBottom: activeTab === tab ? '2px solid #1a2e44' : '2px solid transparent',
    background: 'none', color: activeTab === tab ? '#1a2e44' : '#888',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#f4f6f8', fontFamily: 'var(--font-body)' }}>

      {/* Header */}
      <div style={{ background: '#1a2e44', color: '#fff', padding: '0 20px', height: 48, display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
        <span style={{ fontSize: 15 }}>📋</span>
        <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.3px' }}>FAO Ukraine — LOA QA Planner</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <a href="/" style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, textDecoration: 'none', padding: '4px 10px', borderRadius: 5, border: '1px solid rgba(255,255,255,0.25)' }}>
            ← Procurement
          </a>
          <a href="/planner" style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, textDecoration: 'none', padding: '4px 10px', borderRadius: 5, border: '1px solid rgba(255,255,255,0.25)' }}>
            Planner
          </a>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Sidebar */}
        <aside style={{ width: 260, background: '#fff', borderRight: '1px solid #e8e8e8', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: '14px 14px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#888' }}>LOA Plans</div>
            <button
              onClick={() => setPanelMode('add')}
              style={{ fontSize: 11, fontWeight: 700, background: '#1a2e44', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}
            >
              + New
            </button>
          </div>

          <div style={{ overflowY: 'auto', flex: 1, padding: '0 8px 12px' }}>
            {loading && <div style={{ padding: '20px 8px', color: '#888', fontSize: 12 }}>Loading…</div>}
            {!loading && enriched.length === 0 && (
              <div style={{ padding: '20px 8px', color: '#aaa', fontSize: 12, textAlign: 'center', lineHeight: 1.6 }}>
                No LOA plans yet.<br />Click <strong>+ New</strong> to create one.
              </div>
            )}
            {enriched.map(plan => {
              const isSelected = plan.id === selectedId;
              const p = LOA_PROCESSES[plan.processType];
              const last = plan.steps?.[plan.steps.length - 1];
              return (
                <div
                  key={plan.id}
                  onClick={() => { setSelectedId(plan.id); setActiveTab('table'); }}
                  style={{
                    padding: '10px 10px', borderRadius: 8, marginBottom: 4, cursor: 'pointer',
                    background: isSelected ? '#eaf0f6' : '#fafafa',
                    border: isSelected ? '2px solid #1a2e44' : '2px solid transparent',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: p?.color ?? '#888', flexShrink: 0, display: 'inline-block' }} />
                    <span style={{ fontWeight: 600, fontSize: 12, color: '#1a2e44', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {plan.name}
                    </span>
                    <StatusBadge status={plan.status} />
                  </div>
                  <div style={{ fontSize: 10, color: '#888', marginLeft: 14 }}>{p?.label ?? plan.processType}</div>
                  {last && (
                    <div style={{ fontSize: 10, color: '#aaa', marginLeft: 14, marginTop: 2 }}>
                      Effective: {formatDate(last.minEnd)} – {formatDate(last.maxEnd)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {!selectedPlan && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', color: '#aaa', gap: 12 }}>
              <div style={{ fontSize: 40 }}>📋</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#888' }}>Select a LOA plan to view its timeline</div>
              <div style={{ fontSize: 12 }}>or click <strong>+ New</strong> in the sidebar to create one</div>
            </div>
          )}

          {selectedPlan && proc && (
            <div>
              {/* Plan header */}
              <div style={{ background: '#fff', borderRadius: 10, padding: '16px 20px', marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: proc.color, display: 'inline-block' }} />
                    <span style={{ fontWeight: 700, fontSize: 18, color: '#1a2e44' }}>{selectedPlan.name}</span>
                    <StatusBadge status={computeLoaStatus(selectedPlan)} />
                  </div>
                  <div style={{ fontSize: 12, color: '#888' }}>{proc.label}</div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                    Value: ${Number(selectedPlan.value).toLocaleString()} · Start: {formatDate(new Date(selectedPlan.startDate))}
                    {selectedPlan.loaEndDate && ` · LoA end: ${formatDate(new Date(selectedPlan.loaEndDate))}`}
                  </div>
                </div>
                {lastStep && (
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>Estimated LoA effective</div>
                    <div style={{ fontWeight: 700, color: proc.color, fontSize: 14 }}>{formatDate(new Date(lastStep.minEnd))}</div>
                    <div style={{ fontSize: 11, color: '#aaa' }}>to {formatDate(new Date(lastStep.maxEnd))}</div>
                    {selectedPlan.desiredSigningDate && (
                      <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
                        Target: <strong style={{ color: '#1a2e44' }}>{formatDate(new Date(selectedPlan.desiredSigningDate))}</strong>
                      </div>
                    )}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, alignSelf: 'flex-start' }}>
                  <button
                    onClick={() => setPanelMode(selectedPlan)}
                    style={{ fontSize: 12, padding: '5px 12px', border: '1px solid #ddd', borderRadius: 6, background: '#fff', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(selectedPlan.id)}
                    style={{ fontSize: 12, padding: '5px 12px', border: '1px solid #ffcdd2', borderRadius: 6, background: '#fff', cursor: 'pointer', color: '#c62828', fontWeight: 600 }}
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Feasibility banner */}
              {feasibility === 'infeasible' && (
                <div style={{ background: '#ffebee', border: '1px solid #ef9a9a', borderRadius: 8, padding: '10px 16px', marginBottom: 12, fontSize: 12, color: '#b71c1c', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>⚠️</span>
                  <div>
                    <strong>Not feasible:</strong> the process cannot be completed by the target signing date ({formatDate(new Date(selectedPlan.desiredSigningDate))}).
                    The earliest possible effective date is {formatDate(new Date(lastStep.maxEnd))}.
                    Please edit the plan to set an earlier start date.
                  </div>
                </div>
              )}
              {feasibility === 'ok' && (
                <div style={{ background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 8, padding: '10px 16px', marginBottom: 12, fontSize: 12, color: '#2e7d32', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>✓</span>
                  <div>Feasible — process estimated to complete before the target signing date ({formatDate(new Date(selectedPlan.desiredSigningDate))}).</div>
                </div>
              )}

              {/* Tab bar */}
              <div style={{ background: '#fff', borderRadius: '10px 10px 0 0', borderBottom: '1px solid #e8e8e8', display: 'flex', paddingLeft: 8 }}>
                <button style={tabStyle('table')} onClick={() => setActiveTab('table')}>Step Details</button>
                <button style={tabStyle('gantt')} onClick={() => setActiveTab('gantt')}>Gantt Chart</button>
              </div>

              {/* Table tab */}
              {activeTab === 'table' && (
                <div style={{ background: '#fff', borderRadius: '0 0 10px 10px', padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: '#f4f6f8' }}>
                          <th style={{ textAlign: 'left', padding: '7px 10px', fontWeight: 700, color: '#555', borderBottom: '1px solid #e8e8e8' }}>#</th>
                          <th style={{ textAlign: 'left', padding: '7px 10px', fontWeight: 700, color: '#555', borderBottom: '1px solid #e8e8e8' }}>Step</th>
                          <th style={{ textAlign: 'right', padding: '7px 10px', fontWeight: 700, color: '#555', borderBottom: '1px solid #e8e8e8', whiteSpace: 'nowrap' }}>Earliest start</th>
                          <th style={{ textAlign: 'right', padding: '7px 10px', fontWeight: 700, color: '#555', borderBottom: '1px solid #e8e8e8', whiteSpace: 'nowrap' }}>Latest end</th>
                          <th style={{ textAlign: 'right', padding: '7px 10px', fontWeight: 700, color: '#555', borderBottom: '1px solid #e8e8e8', whiteSpace: 'nowrap' }}>Days</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedPlan.steps.map((step, i) => (
                          <tr key={step.id || i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                            <td style={{ padding: '7px 10px', color: '#888', fontWeight: 600 }}>{i + 1}</td>
                            <td style={{ padding: '7px 10px', color: '#222' }}>{step.name}</td>
                            <td style={{ padding: '7px 10px', textAlign: 'right', color: '#555', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                              {formatDate(step.minStart)}
                            </td>
                            <td style={{ padding: '7px 10px', textAlign: 'right', color: proc.color, whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600 }}>
                              {formatDate(step.maxEnd)}
                            </td>
                            <td style={{ padding: '7px 10px', textAlign: 'right', color: '#888', whiteSpace: 'nowrap' }}>
                              {step.minDays}–{step.maxDays}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Gantt tab */}
              {activeTab === 'gantt' && (
                <div style={{ background: '#fff', borderRadius: '0 0 10px 10px', padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
                  <LoaGantt
                    steps={selectedPlan.steps}
                    color={proc.color}
                    desiredDate={selectedPlan.desiredSigningDate}
                    onDragEnd={handleStepDrag}
                  />
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Slide-in panel */}
      {panelMode !== null && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 99 }}
            onClick={() => setPanelMode(null)}
          />
          <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 380, background: '#fff', boxShadow: '-4px 0 20px rgba(0,0,0,0.15)', zIndex: 100, overflowY: 'auto' }}>
            <button
              onClick={() => setPanelMode(null)}
              style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#888', lineHeight: 1 }}
            >
              ✕
            </button>
            <LoaPanel
              plan={panelMode === 'add' ? null : panelMode}
              onSave={handlePanelSave}
              onClose={() => setPanelMode(null)}
            />
          </div>
        </>
      )}
    </div>
  );
}

// src/planner/PlannerTimeline.jsx
import { formatDate } from '../utils.js';

const STATUS_COLORS = { on_track: '#4CAF50', at_risk: '#FF9800', overdue: '#e53935' };
const PROJECT_PALETTE = ['#e65100', '#6a1b9a', '#0277bd', '#2e7d32', '#c62828'];
const ROW_H = 32;
const LABEL_W = 210;
const MARKER_H = 12;
const PADDING = { top: 28, bottom: 36, right: 20 };

function toMs(iso) { return new Date(iso).getTime(); }

export default function PlannerTimeline({ campaigns, selectedId, onSelect }) {
  if (!campaigns || campaigns.length === 0) {
    return (
      <div className="planner-timeline-section">
        <div className="planner-timeline-header">
          <div className="planner-timeline-title">Agricultural Calendar</div>
        </div>
        <p style={{ color: '#999', fontSize: 12 }}>No campaigns yet.</p>
      </div>
    );
  }

  const allPR = campaigns.map(c => toMs(c.prDeadline)).filter(Boolean);
  const allPlanting = campaigns.map(c => toMs(c.plantingDate)).filter(Boolean);
  const minMs = Math.min(...allPR);
  const maxMs = Math.max(...allPlanting);

  const selected = selectedId ? campaigns.find(c => c.id === selectedId) : null;
  const displayCampaigns = selected ? [selected] : campaigns;
  const zoomMin = selected ? toMs(selected.prDeadline) : minMs;
  const zoomMax = selected ? toMs(selected.plantingDate) : maxMs;
  const zoomRange = zoomMax - zoomMin || 1;

  function xPct(ms) {
    return Math.max(0, Math.min(100, ((ms - zoomMin) / zoomRange) * 100));
  }

  const projectEndMap = {};
  campaigns.forEach(c => {
    (c.fundingProjects || []).forEach((p) => {
      if (p.endDate && !projectEndMap[p.endDate]) {
        projectEndMap[p.endDate] = PROJECT_PALETTE[Object.keys(projectEndMap).length % PROJECT_PALETTE.length];
      }
    });
  });

  const months = [];
  const start = new Date(zoomMin);
  start.setDate(1);
  while (start.getTime() <= zoomMax) {
    months.push(new Date(start));
    start.setMonth(start.getMonth() + 1);
  }

  const today = new Date();
  const todayPct = xPct(today.getTime());
  const svgH = PADDING.top + displayCampaigns.length * ROW_H + PADDING.bottom;

  return (
    <div className="planner-timeline-section">
      <div className="planner-timeline-header">
        <div className="planner-timeline-title">
          {selected ? `🌾 ${selected.cropName}` : `Agricultural Calendar — ${displayCampaigns.length} campaign${displayCampaigns.length !== 1 ? 's' : ''}`}
        </div>
        <div style={{ fontSize: 10, color: '#888' }}>
          {formatDate(new Date(zoomMin))} → {formatDate(new Date(zoomMax))}
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <svg width="100%" style={{ minWidth: 500 }} height={svgH} xmlns="http://www.w3.org/2000/svg">
          {months.map((m, i) => {
            const pct = xPct(m.getTime());
            const x = `calc(${LABEL_W}px + (100% - ${LABEL_W}px) * ${pct / 100})`;
            return (
              <g key={i}>
                <line x1={x} x2={x} y1={PADDING.top} y2={svgH - PADDING.bottom} stroke="#ddd" strokeWidth={1} />
                <text x={x} y={16} fontSize={9} fill="#aaa" textAnchor="middle"
                  style={{ fontFamily: 'var(--font-mono)' }}>
                  {m.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })}
                </text>
              </g>
            );
          })}

          {Object.entries(projectEndMap).map(([dateStr, color]) => {
            const pct = xPct(toMs(dateStr));
            if (pct < 0 || pct > 100) return null;
            const x = `calc(${LABEL_W}px + (100% - ${LABEL_W}px) * ${pct / 100})`;
            return (
              <g key={dateStr}>
                <line x1={x} x2={x} y1={PADDING.top} y2={svgH - PADDING.bottom} stroke={color} strokeWidth={1.5} strokeDasharray="5,3" opacity={0.7} />
              </g>
            );
          })}

          {todayPct >= 0 && todayPct <= 100 && (
            <line
              x1={`calc(${LABEL_W}px + (100% - ${LABEL_W}px) * ${todayPct / 100})`}
              x2={`calc(${LABEL_W}px + (100% - ${LABEL_W}px) * ${todayPct / 100})`}
              y1={PADDING.top}
              y2={svgH - PADDING.bottom}
              stroke="#2563eb" strokeWidth={1.5} strokeDasharray="4,3"
            />
          )}

          {displayCampaigns.map((c, row) => {
            const y = PADDING.top + row * ROW_H;
            const color = STATUS_COLORS[c.status] || '#4CAF50';
            const prPct = xPct(toMs(c.prDeadline));
            const plantPct = xPct(toMs(c.plantingDate));
            const poPct = c.poDeadline ? xPct(toMs(c.poDeadline)) : plantPct;

            return (
              <g key={c.id} style={{ cursor: 'pointer' }} onClick={() => onSelect(selectedId === c.id ? null : c.id)}>
                <rect x={0} y={y} width="100%" height={ROW_H} fill={selectedId === c.id ? '#e8f0e8' : 'transparent'} />

                <text x={8} y={y + 13} fontSize={11} fontWeight={600} fill={c.status === 'overdue' ? '#c62828' : '#1a3a2a'}
                  style={{ fontFamily: 'var(--font-body)' }}>
                  {c.cropName}
                </text>
                <text x={8} y={y + 24} fontSize={9} fill={c.status === 'overdue' ? '#c62828' : '#888'}
                  style={{ fontFamily: 'var(--font-mono)' }}>
                  {c.prDeadline ? new Date(c.prDeadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : ''}
                  {' → '}
                  {c.plantingDate ? new Date(c.plantingDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : ''}
                </text>

                <rect
                  x={`calc(${LABEL_W}px + (100% - ${LABEL_W}px) * ${prPct / 100})`}
                  y={y + 8}
                  width={`calc((100% - ${LABEL_W}px) * ${Math.max(0, poPct - prPct) / 100})`}
                  height={MARKER_H}
                  rx={2}
                  fill={color}
                  opacity={0.85}
                />

                {c.poDeadline && (
                  <rect
                    x={`calc(${LABEL_W}px + (100% - ${LABEL_W}px) * ${poPct / 100})`}
                    y={y + 8}
                    width={`calc((100% - ${LABEL_W}px) * ${Math.max(0, plantPct - poPct) / 100})`}
                    height={MARKER_H}
                    rx={2}
                    fill={color}
                    opacity={0.4}
                  />
                )}

                <rect
                  x={`calc(${LABEL_W}px + (100% - ${LABEL_W}px) * ${plantPct / 100} - 2px)`}
                  y={y + 4}
                  width={4}
                  height={ROW_H - 8}
                  rx={1}
                  fill={color}
                />
              </g>
            );
          })}

          {Object.entries(projectEndMap).map(([dateStr, color]) => {
            const pct = xPct(toMs(dateStr));
            if (pct < 0 || pct > 100) return null;
            return (
              <text
                key={dateStr}
                x={`calc(${LABEL_W}px + (100% - ${LABEL_W}px) * ${pct / 100})`}
                y={svgH - 4}
                fontSize={8}
                fill={color}
                textAnchor="middle"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
              </text>
            );
          })}

          <text x={8} y={svgH - 6} fontSize={8} fill="#aaa" style={{ fontFamily: 'var(--font-body)' }}>
            ■ Procurement &nbsp; □ Delivery &nbsp; | Planting &nbsp; ┆ Today &nbsp; -- Project end
          </text>
        </svg>
      </div>
    </div>
  );
}

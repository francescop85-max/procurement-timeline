// src/planner/PlannerTimeline.jsx
import { formatDate } from '../utils.js';

const STATUS_COLORS = { on_track: '#4CAF50', at_risk: '#FF9800', overdue: '#e53935' };
const PROJECT_PALETTE = ['#e65100', '#6a1b9a', '#0277bd', '#2e7d32', '#c62828'];
const ROW_H = 32;
const LABEL_W = 210;
const MARKER_H = 12;
const SVG_W = 960;
const CHART_W = SVG_W - LABEL_W - 20; // 730px chart area
const PAD_TOP = 28;
const PAD_BOTTOM = 36;

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

  // Returns x pixel position within the SVG viewBox
  function xPos(ms) {
    const pct = Math.max(0, Math.min(1, (ms - zoomMin) / zoomRange));
    return LABEL_W + CHART_W * pct;
  }

  const projectEndMap = {};
  campaigns.forEach(c => {
    (c.fundingProjects || []).forEach(p => {
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

  const todayX = xPos(Date.now());
  const svgH = PAD_TOP + displayCampaigns.length * ROW_H + PAD_BOTTOM;

  return (
    <div className="planner-timeline-section">
      <div className="planner-timeline-header">
        <div className="planner-timeline-title">
          {selected
            ? `🌾 ${selected.cropName}`
            : `Agricultural Calendar — ${displayCampaigns.length} campaign${displayCampaigns.length !== 1 ? 's' : ''}`}
        </div>
        <div style={{ fontSize: 10, color: '#888' }}>
          {formatDate(new Date(zoomMin))} → {formatDate(new Date(zoomMax))}
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <svg
          viewBox={`0 0 ${SVG_W} ${svgH}`}
          width="100%"
          style={{ minWidth: 500, display: 'block' }}
          preserveAspectRatio="none"
        >
          {/* Month gridlines + labels */}
          {months.map((m, i) => {
            const x = xPos(m.getTime());
            return (
              <g key={i}>
                <line x1={x} x2={x} y1={PAD_TOP} y2={svgH - PAD_BOTTOM} stroke="#ddd" strokeWidth={1} />
                <text x={x} y={16} fontSize={9} fill="#aaa" textAnchor="middle">
                  {m.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })}
                </text>
              </g>
            );
          })}

          {/* Project end date markers */}
          {Object.entries(projectEndMap).map(([dateStr, color]) => {
            const x = xPos(toMs(dateStr));
            if (x < LABEL_W || x > SVG_W) return null;
            return (
              <line key={dateStr} x1={x} x2={x} y1={PAD_TOP} y2={svgH - PAD_BOTTOM}
                stroke={color} strokeWidth={1.5} strokeDasharray="5,3" opacity={0.7} />
            );
          })}

          {/* Today marker */}
          {todayX >= LABEL_W && todayX <= SVG_W && (
            <line x1={todayX} x2={todayX} y1={PAD_TOP} y2={svgH - PAD_BOTTOM}
              stroke="#2563eb" strokeWidth={1.5} strokeDasharray="4,3" />
          )}

          {/* Campaign rows */}
          {displayCampaigns.map((c, row) => {
            const y = PAD_TOP + row * ROW_H;
            const color = STATUS_COLORS[c.status] || '#4CAF50';
            const prX = xPos(toMs(c.prDeadline));
            const plantX = xPos(toMs(c.plantingDate));
            const poX = c.poDeadline ? xPos(toMs(c.poDeadline)) : plantX;

            return (
              <g key={c.id} style={{ cursor: 'pointer' }} onClick={() => onSelect(selectedId === c.id ? null : c.id)}>
                <rect x={0} y={y} width={SVG_W} height={ROW_H}
                  fill={selectedId === c.id ? '#e8f0e8' : 'transparent'} />

                <text x={8} y={y + 13} fontSize={11} fontWeight={600}
                  fill={c.status === 'overdue' ? '#c62828' : '#1a3a2a'}>
                  {c.cropName}
                </text>
                <text x={8} y={y + 24} fontSize={9}
                  fill={c.status === 'overdue' ? '#c62828' : '#888'}>
                  {c.prDeadline ? new Date(c.prDeadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : ''}
                  {' → '}
                  {c.plantingDate ? new Date(c.plantingDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : ''}
                </text>

                {/* Procurement bar */}
                <rect x={prX} y={y + 8} width={Math.max(0, poX - prX)} height={MARKER_H}
                  rx={2} fill={color} opacity={0.85} />

                {/* Delivery bar */}
                {c.poDeadline && (
                  <rect x={poX} y={y + 8} width={Math.max(0, plantX - poX)} height={MARKER_H}
                    rx={2} fill={color} opacity={0.4} />
                )}

                {/* Planting marker */}
                <rect x={plantX - 2} y={y + 4} width={4} height={ROW_H - 8} rx={1} fill={color} />
              </g>
            );
          })}

          {/* Project end date labels at bottom */}
          {Object.entries(projectEndMap).map(([dateStr, color]) => {
            const x = xPos(toMs(dateStr));
            if (x < LABEL_W || x > SVG_W) return null;
            return (
              <text key={dateStr} x={x} y={svgH - 4} fontSize={8} fill={color} textAnchor="middle">
                {new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
              </text>
            );
          })}

          {/* Legend */}
          <text x={8} y={svgH - 6} fontSize={8} fill="#aaa">
            ■ Procurement  □ Delivery  | Planting  ┆ Today  -- Project end
          </text>
        </svg>
      </div>
    </div>
  );
}

// src/planner/PlannerTimeline.jsx
import { formatDate } from '../utils.js';

const STATUS_COLORS = { on_track: '#4CAF50', at_risk: '#FF9800', overdue: '#e53935' };
const PROJECT_PALETTE = ['#e65100', '#6a1b9a', '#0277bd', '#2e7d32', '#c62828'];
const ROW_H = 28;
const LABEL_W = 220;
const MARKER_H = 12;
const SVG_W = 960;
const CHART_W = SVG_W - LABEL_W - 20;
const PAD_TOP = 24;
const PAD_BOTTOM = 32;

function toMs(iso) { return new Date(iso).getTime(); }

function buildChartFns(zoomMin, zoomMax) {
  const zoomRange = zoomMax - zoomMin || 1;
  return (ms) => LABEL_W + CHART_W * Math.max(0, Math.min(1, (ms - zoomMin) / zoomRange));
}

function buildProjectEndMap(campaigns) {
  const map = {};
  campaigns.forEach(c => {
    (c.fundingProjects || []).forEach(p => {
      if (p.endDate && !map[p.endDate]) {
        map[p.endDate] = PROJECT_PALETTE[Object.keys(map).length % PROJECT_PALETTE.length];
      }
    });
  });
  return map;
}

function buildMonths(zoomMin, zoomMax) {
  const months = [];
  const d = new Date(zoomMin);
  d.setDate(1);
  while (d.getTime() <= zoomMax) {
    months.push(new Date(d));
    d.setMonth(d.getMonth() + 1);
  }
  return months;
}

function ChartBase({ xPos, months, projectEndMap, todayX, svgH }) {
  return (
    <>
      {months.map((m, i) => {
        const x = xPos(m.getTime());
        return (
          <g key={i}>
            <line x1={x} x2={x} y1={PAD_TOP} y2={svgH - PAD_BOTTOM} stroke="#ddd" strokeWidth={1} />
            <text x={x} y={14} fontSize={9} fill="#aaa" textAnchor="middle">
              {m.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })}
            </text>
          </g>
        );
      })}
      {Object.entries(projectEndMap).map(([dateStr, color]) => {
        const x = xPos(toMs(dateStr));
        if (x < LABEL_W || x > SVG_W) return null;
        return (
          <line key={dateStr} x1={x} x2={x} y1={PAD_TOP} y2={svgH - PAD_BOTTOM}
            stroke={color} strokeWidth={1.5} strokeDasharray="5,3" opacity={0.7} />
        );
      })}
      {todayX >= LABEL_W && todayX <= SVG_W && (
        <line x1={todayX} x2={todayX} y1={PAD_TOP} y2={svgH - PAD_BOTTOM}
          stroke="#2563eb" strokeWidth={1.5} strokeDasharray="4,3" />
      )}
      {Object.entries(projectEndMap).map(([dateStr, color]) => {
        const x = xPos(toMs(dateStr));
        if (x < LABEL_W || x > SVG_W) return null;
        return (
          <text key={dateStr} x={x} y={svgH - 4} fontSize={8} fill={color} textAnchor="middle">
            {new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
          </text>
        );
      })}
    </>
  );
}

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

  const selected = selectedId ? campaigns.find(c => c.id === selectedId) : null;

  // ── DETAIL MODE ──────────────────────────────────────────────────────────
  if (selected && selected.steps && selected.steps.length > 0) {
    const steps = selected.steps;
    const color = STATUS_COLORS[selected.status] || '#4CAF50';

    const zoomMin = toMs(selected.prDeadline);
    const zoomMax = toMs(selected.plantingDate);
    const xPos = buildChartFns(zoomMin, zoomMax);
    const projectEndMap = buildProjectEndMap([selected]);
    const months = buildMonths(zoomMin, zoomMax);
    const todayX = xPos(Date.now());

    // Extra rows: delivery (if any) + planting
    const extraRows = (selected.deliveryWeeks > 0 ? 1 : 0) + 1;
    const svgH = PAD_TOP + (steps.length + extraRows) * ROW_H + PAD_BOTTOM;

    return (
      <div className="planner-timeline-section">
        <div className="planner-timeline-header">
          <div className="planner-timeline-title">🌾 {selected.cropName} — Step Timeline</div>
          <div style={{ fontSize: 10, color: '#888' }}>
            {formatDate(new Date(zoomMin))} → {formatDate(new Date(zoomMax))}
            <button
              onClick={() => onSelect(null)}
              style={{ marginLeft: 12, fontSize: 10, color: '#1565c0', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              ← All campaigns
            </button>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <svg viewBox={`0 0 ${SVG_W} ${svgH}`} width="100%" style={{ minWidth: 500, display: 'block' }} preserveAspectRatio="none">
            <ChartBase xPos={xPos} months={months} projectEndMap={projectEndMap} todayX={todayX} svgH={svgH} />

            {steps.map((step, i) => {
              const y = PAD_TOP + i * ROW_H;
              const minX = xPos(step.minStart instanceof Date ? step.minStart.getTime() : toMs(step.minStart));
              const maxX = xPos(step.maxEnd instanceof Date ? step.maxEnd.getTime() : toMs(step.maxEnd));
              const barW = Math.max(2, maxX - minX);

              return (
                <g key={i}>
                  <text x={8} y={y + 12} fontSize={10} fill="#333">{i + 1}. {step.name}</text>
                  <text x={8} y={y + 22} fontSize={8} fill="#999">{step.owner}</text>
                  <rect x={minX} y={y + 6} width={barW} height={MARKER_H} rx={2} fill={color} opacity={0.8} />
                </g>
              );
            })}

            {selected.deliveryWeeks > 0 && (() => {
              const i = steps.length;
              const y = PAD_TOP + i * ROW_H;
              const poX = xPos(toMs(selected.poDeadline));
              const plantX = xPos(toMs(selected.plantingDate));
              return (
                <g key="delivery">
                  <text x={8} y={y + 12} fontSize={10} fill="#388e3c">🚚 Delivery ({selected.deliveryWeeks} wks)</text>
                  <rect x={poX} y={y + 6} width={Math.max(2, plantX - poX)} height={MARKER_H} rx={2} fill="#4CAF50" opacity={0.35} />
                </g>
              );
            })()}

            {(() => {
              const i = steps.length + (selected.deliveryWeeks > 0 ? 1 : 0);
              const y = PAD_TOP + i * ROW_H;
              const plantX = xPos(toMs(selected.plantingDate));
              return (
                <g key="planting">
                  <text x={8} y={y + 15} fontSize={10} fontWeight={700} fill="#1a3a2a">🌱 Planting Date</text>
                  <rect x={plantX - 3} y={y + 2} width={6} height={ROW_H - 4} rx={1} fill={color} />
                  <text x={plantX} y={y + ROW_H + 2} fontSize={8} fill={color} textAnchor="middle">
                    {formatDate(new Date(selected.plantingDate))}
                  </text>
                </g>
              );
            })()}

            <text x={8} y={svgH - 6} fontSize={8} fill="#aaa">
              ■ Step range  | Planting  ┆ Today  -- Project end
            </text>
          </svg>
        </div>
      </div>
    );
  }

  // ── OVERVIEW MODE ─────────────────────────────────────────────────────────
  const allPR = campaigns.map(c => toMs(c.prDeadline)).filter(Boolean);
  const allPlanting = campaigns.map(c => toMs(c.plantingDate)).filter(Boolean);
  const zoomMin = Math.min(...allPR);
  const zoomMax = Math.max(...allPlanting);
  const xPos = buildChartFns(zoomMin, zoomMax);
  const projectEndMap = buildProjectEndMap(campaigns);
  const months = buildMonths(zoomMin, zoomMax);
  const todayX = xPos(Date.now());
  const svgH = PAD_TOP + campaigns.length * ROW_H + PAD_BOTTOM;

  return (
    <div className="planner-timeline-section">
      <div className="planner-timeline-header">
        <div className="planner-timeline-title">
          Agricultural Calendar — {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}
        </div>
        <div style={{ fontSize: 10, color: '#888' }}>
          {formatDate(new Date(zoomMin))} → {formatDate(new Date(zoomMax))}
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${SVG_W} ${svgH}`} width="100%" style={{ minWidth: 500, display: 'block' }} preserveAspectRatio="none">
          <ChartBase xPos={xPos} months={months} projectEndMap={projectEndMap} todayX={todayX} svgH={svgH} />

          {campaigns.map((c, row) => {
            const y = PAD_TOP + row * ROW_H;
            const color = STATUS_COLORS[c.status] || '#4CAF50';
            const prX = xPos(toMs(c.prDeadline));
            const plantX = xPos(toMs(c.plantingDate));
            const poX = c.poDeadline ? xPos(toMs(c.poDeadline)) : plantX;

            return (
              <g key={c.id} style={{ cursor: 'pointer' }} onClick={() => onSelect(selectedId === c.id ? null : c.id)}>
                <rect x={0} y={y} width={SVG_W} height={ROW_H} fill={selectedId === c.id ? '#e8f0e8' : 'transparent'} />
                <text x={8} y={y + 11} fontSize={11} fontWeight={600} fill={c.status === 'overdue' ? '#c62828' : '#1a3a2a'}>
                  {c.cropName}
                </text>
                <text x={8} y={y + 22} fontSize={9} fill={c.status === 'overdue' ? '#c62828' : '#888'}>
                  {c.prDeadline ? new Date(c.prDeadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : ''}
                  {' → '}
                  {c.plantingDate ? new Date(c.plantingDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : ''}
                </text>
                <rect x={prX} y={y + 7} width={Math.max(0, poX - prX)} height={MARKER_H} rx={2} fill={color} opacity={0.85} />
                {c.poDeadline && (
                  <rect x={poX} y={y + 7} width={Math.max(0, plantX - poX)} height={MARKER_H} rx={2} fill={color} opacity={0.35} />
                )}
                <rect x={plantX - 2} y={y + 3} width={4} height={ROW_H - 6} rx={1} fill={color} />
              </g>
            );
          })}

          <text x={8} y={svgH - 6} fontSize={8} fill="#aaa">
            ■ Procurement  □ Delivery  | Planting  ┆ Today  -- Project end
          </text>
        </svg>
      </div>
    </div>
  );
}

// src/planner/PlannerTimeline.jsx
import { formatDate } from '../utils.js';

const STATUS_COLORS = { on_track: '#4CAF50', at_risk: '#FF9800', overdue: '#e53935' };
const PROJECT_PALETTE = ['#e65100', '#6a1b9a', '#0277bd', '#2e7d32', '#c62828'];
const ROW_H = 30;
const LABEL_W = 220;
const SVG_W = 960;
const CHART_W = SVG_W - LABEL_W - 20;
const PAD_TOP = 24;
const PAD_BOTTOM = 40;

function toMs(d) { return new Date(d).getTime(); }

function buildXPos(zoomMin, zoomMax) {
  const range = zoomMax - zoomMin || 1;
  return ms => LABEL_W + CHART_W * Math.max(0, Math.min(1, (ms - zoomMin) / range));
}

function buildProjectEndMap(campaigns) {
  const map = {};
  campaigns.forEach(c =>
    (c.fundingProjects || []).forEach(p => {
      if (p.endDate && !map[p.endDate])
        map[p.endDate] = PROJECT_PALETTE[Object.keys(map).length % PROJECT_PALETTE.length];
    })
  );
  return map;
}

function buildMonths(zoomMin, zoomMax) {
  const months = [];
  const d = new Date(zoomMin);
  d.setDate(1);
  while (d.getTime() <= zoomMax) { months.push(new Date(d)); d.setMonth(d.getMonth() + 1); }
  return months;
}

function GridAndMarkers({ xPos, months, projectEndMap, todayX, svgH }) {
  return (
    <>
      {/* Month gridlines */}
      {months.map((m, i) => {
        const x = xPos(m.getTime());
        return (
          <g key={i}>
            <line x1={x} x2={x} y1={PAD_TOP} y2={svgH - PAD_BOTTOM} stroke="#e8e8e8" strokeWidth={1} />
            <text x={x} y={14} fontSize={9} fill="#bbb" textAnchor="middle">
              {m.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })}
            </text>
          </g>
        );
      })}

      {/* Project end date dashed lines */}
      {Object.entries(projectEndMap).map(([dateStr, color]) => {
        const x = xPos(toMs(dateStr));
        if (x < LABEL_W || x > SVG_W) return null;
        return (
          <g key={dateStr}>
            <line x1={x} x2={x} y1={PAD_TOP} y2={svgH - PAD_BOTTOM}
              stroke={color} strokeWidth={2} strokeDasharray="6,3" opacity={0.85} />
            <text x={x} y={svgH - PAD_BOTTOM + 12} fontSize={8} fill={color} textAnchor="middle" fontWeight={600}>
              {new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
            </text>
            <text x={x} y={svgH - PAD_BOTTOM + 22} fontSize={7} fill={color} textAnchor="middle">
              proj. end
            </text>
          </g>
        );
      })}

      {/* Today marker */}
      {todayX >= LABEL_W && todayX <= SVG_W && (
        <g>
          <line x1={todayX} x2={todayX} y1={PAD_TOP} y2={svgH - PAD_BOTTOM}
            stroke="#2563eb" strokeWidth={1.5} strokeDasharray="4,3" />
          <text x={todayX} y={svgH - PAD_BOTTOM + 12} fontSize={7} fill="#2563eb" textAnchor="middle">today</text>
        </g>
      )}
    </>
  );
}

// Small vertical tick with a date label below a bar
function DateTick({ x, y, label, color = '#555' }) {
  return (
    <g>
      <line x1={x} x2={x} y1={y - 3} y2={y + 16} stroke={color} strokeWidth={1} opacity={0.6} />
      <text x={x} y={y + 26} fontSize={7} fill={color} textAnchor="middle">{label}</text>
    </g>
  );
}

export default function PlannerTimeline({ campaigns, selectedId, onSelect }) {
  if (!campaigns || campaigns.length === 0) {
    return (
      <div className="planner-timeline-section">
        <div className="planner-timeline-header"><div className="planner-timeline-title">Agricultural Calendar</div></div>
        <p style={{ color: '#999', fontSize: 12 }}>No campaigns yet.</p>
      </div>
    );
  }

  const selected = selectedId ? campaigns.find(c => c.id === selectedId) : null;

  // ── DETAIL MODE ───────────────────────────────────────────────────────────
  if (selected && selected.steps && selected.steps.length > 0) {
    const steps = selected.steps;
    const color = STATUS_COLORS[selected.status] || '#4CAF50';

    const zoomMin = toMs(selected.prDeadline);
    const zoomMax = toMs(selected.plantingDate);
    const xPos = buildXPos(zoomMin, zoomMax);
    const projectEndMap = buildProjectEndMap([selected]);
    const months = buildMonths(zoomMin, zoomMax);
    const todayX = xPos(Date.now());
    const poX = selected.poDeadline ? xPos(toMs(selected.poDeadline)) : null;
    const plantX = xPos(toMs(selected.plantingDate));

    const extraRows = (selected.deliveryWeeks > 0 ? 1 : 0) + 1; // delivery + planting
    const svgH = PAD_TOP + (steps.length + extraRows) * ROW_H + PAD_BOTTOM;

    return (
      <div className="planner-timeline-section">
        <div className="planner-timeline-header">
          <div className="planner-timeline-title">🌾 {selected.cropName} — Procurement Steps</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 10, color: '#888' }}>
            <span>PR: <strong>{formatDate(new Date(selected.prDeadline))}</strong></span>
            {selected.poDeadline && <span>PO by: <strong style={{ color: '#e65100' }}>{formatDate(new Date(selected.poDeadline))}</strong></span>}
            <span>Planting: <strong style={{ color: '#2e7d32' }}>{formatDate(new Date(selected.plantingDate))}</strong></span>
            <button onClick={() => onSelect(null)}
              style={{ fontSize: 10, color: '#1565c0', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              ← All campaigns
            </button>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <svg viewBox={`0 0 ${SVG_W} ${svgH}`} width="100%" style={{ minWidth: 500, display: 'block' }} preserveAspectRatio="none">
            <GridAndMarkers xPos={xPos} months={months} projectEndMap={projectEndMap} todayX={todayX} svgH={svgH} />

            {/* PO date vertical line */}
            {poX && (
              <g>
                <line x1={poX} x2={poX} y1={PAD_TOP} y2={svgH - PAD_BOTTOM}
                  stroke="#e65100" strokeWidth={1.5} strokeDasharray="3,2" opacity={0.7} />
                <text x={poX} y={svgH - PAD_BOTTOM + 12} fontSize={8} fill="#e65100" textAnchor="middle" fontWeight={600}>
                  {new Date(selected.poDeadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                </text>
                <text x={poX} y={svgH - PAD_BOTTOM + 22} fontSize={7} fill="#e65100" textAnchor="middle">PO by</text>
              </g>
            )}

            {/* Planting date vertical line */}
            <g>
              <line x1={plantX} x2={plantX} y1={PAD_TOP} y2={svgH - PAD_BOTTOM}
                stroke="#2e7d32" strokeWidth={2} opacity={0.8} />
              <text x={plantX} y={svgH - PAD_BOTTOM + 12} fontSize={8} fill="#2e7d32" textAnchor="middle" fontWeight={600}>
                {new Date(selected.plantingDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
              </text>
              <text x={plantX} y={svgH - PAD_BOTTOM + 22} fontSize={7} fill="#2e7d32" textAnchor="middle">🌱 planting</text>
            </g>

            {/* Step rows */}
            {steps.map((step, i) => {
              const y = PAD_TOP + i * ROW_H;
              const minX = xPos(step.minStart instanceof Date ? step.minStart.getTime() : toMs(step.minStart));
              const maxX = xPos(step.maxEnd instanceof Date ? step.maxEnd.getTime() : toMs(step.maxEnd));
              const barW = Math.max(2, maxX - minX);
              return (
                <g key={i}>
                  <text x={8} y={y + 11} fontSize={10} fill="#333">{i + 1}. {step.name}</text>
                  <text x={8} y={y + 22} fontSize={8} fill="#aaa">{step.owner}</text>
                  <rect x={minX} y={y + 5} width={barW} height={14} rx={2} fill={color} opacity={0.75} />
                </g>
              );
            })}

            {/* Delivery row */}
            {selected.deliveryWeeks > 0 && (() => {
              const y = PAD_TOP + steps.length * ROW_H;
              const startX = poX || plantX;
              return (
                <g>
                  <text x={8} y={y + 11} fontSize={10} fill="#388e3c">🚚 Delivery ({selected.deliveryWeeks} wks)</text>
                  <text x={8} y={y + 22} fontSize={8} fill="#aaa">Supplier → site</text>
                  <rect x={startX} y={y + 5} width={Math.max(2, plantX - startX)} height={14} rx={2} fill="#4CAF50" opacity={0.3} />
                </g>
              );
            })()}

            {/* Planting row */}
            {(() => {
              const i = steps.length + (selected.deliveryWeeks > 0 ? 1 : 0);
              const y = PAD_TOP + i * ROW_H;
              return (
                <g>
                  <text x={8} y={y + 15} fontSize={10} fontWeight={700} fill="#1a3a2a">🌱 Planting Date</text>
                  <rect x={plantX - 4} y={y + 2} width={8} height={22} rx={2} fill={color} opacity={0.9} />
                </g>
              );
            })()}

            <text x={8} y={svgH - 6} fontSize={8} fill="#aaa">
              ■ Step range  | PO deadline  | Planting  ┆ Today  -- Project end
            </text>
          </svg>
        </div>
      </div>
    );
  }

  // ── OVERVIEW MODE ──────────────────────────────────────────────────────────
  const zoomMin = Math.min(...campaigns.map(c => toMs(c.prDeadline)).filter(Boolean));
  const zoomMax = Math.max(...campaigns.map(c => toMs(c.plantingDate)).filter(Boolean));
  const xPos = buildXPos(zoomMin, zoomMax);
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
          <GridAndMarkers xPos={xPos} months={months} projectEndMap={projectEndMap} todayX={todayX} svgH={svgH} />

          {campaigns.map((c, row) => {
            const y = PAD_TOP + row * ROW_H;
            const color = STATUS_COLORS[c.status] || '#4CAF50';
            const prX  = xPos(toMs(c.prDeadline));
            const poX  = c.poDeadline  ? xPos(toMs(c.poDeadline))  : null;
            const plantX = xPos(toMs(c.plantingDate));
            const barEndX = poX || plantX;

            return (
              <g key={c.id} style={{ cursor: 'pointer' }} onClick={() => onSelect(c.id)}>
                <rect x={0} y={y} width={SVG_W} height={ROW_H} fill="transparent" />

                {/* Label */}
                <text x={8} y={y + 11} fontSize={11} fontWeight={600}
                  fill={c.status === 'overdue' ? '#c62828' : '#1a3a2a'}>{c.cropName}</text>
                <text x={8} y={y + 22} fontSize={8} fill="#999">
                  PR: {new Date(c.prDeadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                  {c.poDeadline ? `  PO: ${new Date(c.poDeadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}` : ''}
                  {'  🌱 '}{new Date(c.plantingDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                </text>

                {/* Procurement bar (PR → PO) */}
                <rect x={prX} y={y + 7} width={Math.max(2, barEndX - prX)} height={12} rx={2} fill={color} opacity={0.85} />

                {/* Delivery bar (PO → planting) */}
                {poX && (
                  <rect x={poX} y={y + 7} width={Math.max(2, plantX - poX)} height={12} rx={2} fill={color} opacity={0.3} />
                )}

                {/* PO tick */}
                {poX && <DateTick x={poX} y={y + 7} label={new Date(c.poDeadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} color="#e65100" />}

                {/* Planting marker */}
                <rect x={plantX - 2} y={y + 3} width={4} height={ROW_H - 6} rx={1} fill={color} />
              </g>
            );
          })}

          <text x={8} y={svgH - 6} fontSize={8} fill="#aaa">
            ■ Procurement  □ Delivery  | PO date  | Planting  ┆ Today  -- Project end
          </text>
        </svg>
      </div>
    </div>
  );
}

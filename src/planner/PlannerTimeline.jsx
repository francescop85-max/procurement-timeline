// src/planner/PlannerTimeline.jsx
import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { formatDate } from '../utils.js';

const STATUS_COLORS = { on_track: '#4CAF50', at_risk: '#FF9800', overdue: '#e53935' };
const PROJECT_PALETTE = ['#e65100', '#6a1b9a', '#0277bd', '#2e7d32', '#c62828'];
const ROW_H = 30;
const LABEL_W = 220;
const SVG_W = 960;
const CHART_W = SVG_W - LABEL_W - 20;
const PAD_TOP = 24;
const PAD_BOTTOM = 40;
const MS_PER_DAY = 86400000;

function toMs(d) { return new Date(d).getTime(); }

// Returns SVG text-anchor and x offset so labels near edges don't clip
function edgeAnchor(x, margin = 52) {
  if (x > SVG_W - margin) return { anchor: 'end',   dx: -4 };
  if (x < LABEL_W + margin) return { anchor: 'start', dx:  4 };
  return { anchor: 'middle', dx: 0 };
}

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

      {Object.entries(projectEndMap).map(([dateStr, color]) => {
        const x = xPos(toMs(dateStr));
        if (x < LABEL_W || x > SVG_W) return null;
        const { anchor, dx } = edgeAnchor(x);
        return (
          <g key={dateStr}>
            <line x1={x} x2={x} y1={PAD_TOP} y2={svgH - PAD_BOTTOM}
              stroke={color} strokeWidth={2} strokeDasharray="6,3" opacity={0.85} />
            <text x={x + dx} y={svgH - PAD_BOTTOM + 12} fontSize={8} fill={color} textAnchor={anchor} fontWeight={600}>
              {new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
            </text>
            <text x={x + dx} y={svgH - PAD_BOTTOM + 22} fontSize={7} fill={color} textAnchor={anchor}>proj. end</text>
          </g>
        );
      })}

      {todayX > LABEL_W && todayX <= SVG_W && (
        <g>
          {(() => { const { anchor, dx } = edgeAnchor(todayX); return (
            <>
              <line x1={todayX} x2={todayX} y1={PAD_TOP} y2={svgH - PAD_BOTTOM}
                stroke="#2563eb" strokeWidth={1.5} strokeDasharray="4,3" />
              <text x={todayX + dx} y={svgH - PAD_BOTTOM + 12} fontSize={7} fill="#2563eb" textAnchor={anchor}>today</text>
            </>
          ); })()}
        </g>
      )}
    </>
  );
}

function DateTick({ x, y, label, color = '#555' }) {
  const { anchor, dx } = edgeAnchor(x);
  return (
    <g>
      <line x1={x} x2={x} y1={y - 3} y2={y + 16} stroke={color} strokeWidth={1} opacity={0.6} />
      <text x={x + dx} y={y + 26} fontSize={7} fill={color} textAnchor={anchor}>{label}</text>
    </g>
  );
}

function Tooltip({ tip }) {
  if (!tip) return null;
  return (
    <div style={{
      position: 'fixed', left: tip.x + 12, top: tip.y - 8,
      background: 'rgba(20,40,20,0.92)', color: '#fff',
      padding: '6px 10px', borderRadius: 5, fontSize: 11,
      pointerEvents: 'none', zIndex: 9999, maxWidth: 220,
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)', lineHeight: 1.5,
    }}>
      {tip.lines.map((l, i) => <div key={i}>{l}</div>)}
    </div>
  );
}

export default function PlannerTimeline({ campaigns, selectedId, onSelect, onUpdateSteps, onDragUpdate }) {
  const [tip, setTip] = useState(null);
  const [hoveredRow, setHoveredRow] = useState(null);
  // stepOffsets[i] = ms delta applied to step i (and all steps after it when dragged)
  const [stepOffsets, setStepOffsets] = useState([]);
  const [dragging, setDragging] = useState(null); // { stepIndex, startClientX, baseOffsets }
  const svgRef = useRef(null);

  // Reset drag state when selection changes
  useEffect(() => {
    setStepOffsets([]);
    setDragging(null);
    setTip(null);
    onDragUpdate?.(null);
  }, [selectedId]);

  // Sync effective steps to parent on every offset change (runs after paint, before next frame)
  const selectedStepsRef = useRef(null);
  useLayoutEffect(() => {
    const steps = selectedStepsRef.current;
    if (!steps || !stepOffsets.some(o => o !== 0)) {
      onDragUpdate?.(null);
      return;
    }
    onDragUpdate?.(steps.map((step, i) => {
      const off = stepOffsets[i] || 0;
      if (off === 0) return step;
      return {
        ...step,
        minStart: new Date(toMs(step.minStart) + off).toISOString(),
        maxStart: new Date(toMs(step.maxStart) + off).toISOString(),
        minEnd:   new Date(toMs(step.minEnd)   + off).toISOString(),
        maxEnd:   new Date(toMs(step.maxEnd)   + off).toISOString(),
      };
    }));
  }, [stepOffsets]);

  function showTip(e, lines) { setTip({ x: e.clientX, y: e.clientY, lines }); }
  function moveTip(e) { setTip(t => t ? { ...t, x: e.clientX, y: e.clientY } : null); }
  function hideTip() { setTip(null); }

  if (!campaigns || campaigns.length === 0) {
    return (
      <div className="planner-timeline-section">
        <div className="planner-timeline-header"><div className="planner-timeline-title">Agricultural Calendar</div></div>
        <p style={{ color: '#999', fontSize: 12 }}>No campaigns yet.</p>
      </div>
    );
  }

  const selected = selectedId ? campaigns.find(c => c.id === selectedId) : null;
  selectedStepsRef.current = selected?.steps ?? null;

  // ── DETAIL MODE ───────────────────────────────────────────────────────────
  if (selected && selected.steps && selected.steps.length > 0) {
    const steps = selected.steps;
    const color = STATUS_COLORS[selected.status] || '#4CAF50';

    // Compute effective step ms values with offsets applied
    function effMs(stepDate, stepIndex) {
      return toMs(stepDate) + (stepOffsets[stepIndex] || 0);
    }

    // Widen zoom to accommodate dragged bars and project end dates
    const allStepMs = steps.flatMap((s, i) => [effMs(s.minStart, i), effMs(s.maxEnd, i)]);
    const detailProjectEndMs = (selected.fundingProjects || [])
      .map(p => p.endDate ? toMs(p.endDate) : null).filter(Boolean);
    const zoomMin = Math.min(toMs(selected.prDeadline), ...allStepMs);
    const zoomMax = Math.max(toMs(selected.plantingDate), ...allStepMs, ...detailProjectEndMs);
    const xPos = buildXPos(zoomMin, zoomMax);
    const projectEndMap = buildProjectEndMap([selected]);
    const months = buildMonths(zoomMin, zoomMax);
    const todayX = xPos(Date.now());
    const poX = selected.poDeadline ? xPos(toMs(selected.poDeadline)) : null;
    const plantX = xPos(toMs(selected.plantingDate));

    const extraRows = (selected.deliveryWeeks > 0 ? 1 : 0) + 1;
    const svgH = PAD_TOP + (steps.length + extraRows) * ROW_H + PAD_BOTTOM;
    const isDirty = stepOffsets.some(o => o !== 0);

    function startDrag(e, stepIndex) {
      e.preventDefault();
      e.stopPropagation();
      hideTip();
      setDragging({
        stepIndex,
        startClientX: e.clientX,
        baseOffsets: stepOffsets.length ? [...stepOffsets] : new Array(steps.length).fill(0),
      });
    }

    function computeEffectiveSteps(offsets) {
      return steps.map((step, i) => {
        const off = offsets[i] || 0;
        if (off === 0) return step;
        return {
          ...step,
          minStart: new Date(toMs(step.minStart) + off).toISOString(),
          maxStart: new Date(toMs(step.maxStart) + off).toISOString(),
          minEnd:   new Date(toMs(step.minEnd)   + off).toISOString(),
          maxEnd:   new Date(toMs(step.maxEnd)   + off).toISOString(),
        };
      });
    }

    function onSvgMouseMove(e) {
      if (!dragging || !svgRef.current) return;
      const svgWidth = svgRef.current.getBoundingClientRect().width;
      const svgScale = SVG_W / (svgWidth || SVG_W);
      const deltaSvg = (e.clientX - dragging.startClientX) * svgScale;
      const msPerSvgUnit = (zoomMax - zoomMin) / CHART_W;
      const deltaMs = Math.round(deltaSvg * msPerSvgUnit / MS_PER_DAY) * MS_PER_DAY;
      const newOffsets = [...dragging.baseOffsets];
      for (let j = dragging.stepIndex; j < steps.length; j++) {
        newOffsets[j] = dragging.baseOffsets[j] + deltaMs;
      }
      setStepOffsets(newOffsets);
      onDragUpdate?.(computeEffectiveSteps(newOffsets));
    }

    function onSvgMouseUp() {
      if (!dragging) return;
      setDragging(null);
    }

    function saveChanges() {
      if (!onUpdateSteps) return;
      onUpdateSteps(selected.id, computeEffectiveSteps(stepOffsets));
      setStepOffsets([]);
      onDragUpdate?.(null);
    }

    function resetChanges() {
      setStepOffsets([]);
      onDragUpdate?.(null);
    }

    return (
      <div className="planner-timeline-section">
        <Tooltip tip={dragging ? null : tip} />
        <div className="planner-timeline-header">
          <div className="planner-timeline-title">🌾 {selected.cropName} — Procurement Steps</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 10, color: '#888' }}>
            <span>PR: <strong>{formatDate(new Date(selected.prDeadline))}</strong></span>
            {selected.poDeadline && <span>PO by: <strong style={{ color: '#e65100' }}>{formatDate(new Date(selected.poDeadline))}</strong></span>}
            <span>Planting: <strong style={{ color: '#2e7d32' }}>{formatDate(new Date(selected.plantingDate))}</strong></span>
            {isDirty && (
              <>
                <button onClick={saveChanges}
                  style={{ fontSize: 10, color: '#fff', background: '#2e7d32', border: 'none', cursor: 'pointer', padding: '2px 8px', borderRadius: 3 }}>
                  Save changes
                </button>
                <button onClick={resetChanges}
                  style={{ fontSize: 10, color: '#666', background: 'none', border: '1px solid #ccc', cursor: 'pointer', padding: '2px 8px', borderRadius: 3 }}>
                  Reset
                </button>
              </>
            )}
            <button onClick={() => onSelect(null)}
              style={{ fontSize: 10, color: '#1565c0', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              ← All campaigns
            </button>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${SVG_W} ${svgH}`}
            width="100%"
            style={{ minWidth: 500, display: 'block', cursor: dragging ? 'grabbing' : 'default', userSelect: 'none' }}
            preserveAspectRatio="none"
            onMouseMove={onSvgMouseMove}
            onMouseUp={onSvgMouseUp}
            onMouseLeave={onSvgMouseUp}
          >
            <GridAndMarkers xPos={xPos} months={months} projectEndMap={projectEndMap} todayX={todayX} svgH={svgH} />

            {poX && (() => { const { anchor, dx } = edgeAnchor(poX); return (
              <g>
                <line x1={poX} x2={poX} y1={PAD_TOP} y2={svgH - PAD_BOTTOM}
                  stroke="#e65100" strokeWidth={1.5} strokeDasharray="3,2" opacity={0.7} />
                <text x={poX + dx} y={svgH - PAD_BOTTOM + 12} fontSize={8} fill="#e65100" textAnchor={anchor} fontWeight={600}>
                  {new Date(selected.poDeadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                </text>
                <text x={poX + dx} y={svgH - PAD_BOTTOM + 22} fontSize={7} fill="#e65100" textAnchor={anchor}>PO by</text>
              </g>
            ); })()}

            {(() => { const { anchor, dx } = edgeAnchor(plantX); return (
              <g>
                <line x1={plantX} x2={plantX} y1={PAD_TOP} y2={svgH - PAD_BOTTOM}
                  stroke="#2e7d32" strokeWidth={2} opacity={0.8} />
                <text x={plantX + dx} y={svgH - PAD_BOTTOM + 12} fontSize={8} fill="#2e7d32" textAnchor={anchor} fontWeight={600}>
                  {new Date(selected.plantingDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                </text>
                <text x={plantX + dx} y={svgH - PAD_BOTTOM + 22} fontSize={7} fill="#2e7d32" textAnchor={anchor}>🌱 planting</text>
              </g>
            ); })()}

            {steps.map((step, i) => {
              const y = PAD_TOP + i * ROW_H;
              const minX = xPos(effMs(step.minStart, i));
              const maxX = xPos(effMs(step.maxEnd, i));
              const barW = Math.max(2, maxX - minX);
              const isBeingDragged = dragging?.stepIndex <= i;
              const effectiveMinEnd = new Date(effMs(step.minEnd, i));
              const effectiveMaxEnd = new Date(effMs(step.maxEnd, i));
              const tipLines = [
                `${i + 1}. ${step.name}`,
                `Owner: ${step.owner}`,
                `Duration: ${step.minDays === step.maxDays ? step.minDays : `${step.minDays}–${step.maxDays}`} ${step.calendarDays ? 'cal' : 'working'} days`,
                `Earliest end: ${formatDate(effectiveMinEnd)}`,
                `Latest end: ${formatDate(effectiveMaxEnd)}`,
              ];
              return (
                <g key={i}
                  onMouseEnter={e => { if (!dragging) { setHoveredRow(i); showTip(e, tipLines); } }}
                  onMouseMove={e => { if (!dragging) moveTip(e); }}
                  onMouseLeave={() => { setHoveredRow(null); hideTip(); }}>
                  <rect x={0} y={y} width={SVG_W} height={ROW_H}
                    fill={hoveredRow === i && !dragging ? 'rgba(46,126,46,0.07)' : 'transparent'} />
                  <text x={8} y={y + 10} fontSize={8} fill="#333">{i + 1}. {step.name}</text>
                  <text x={8} y={y + 20} fontSize={7} fill={isBeingDragged ? color : '#aaa'}>{step.owner}</text>
                  <rect
                    x={minX} y={y + 4} width={barW} height={16} rx={2}
                    fill={color}
                    opacity={isBeingDragged ? 0.95 : 0.75}
                    style={{ cursor: dragging ? 'grabbing' : 'grab' }}
                    onMouseDown={e => startDrag(e, i)}
                  />
                </g>
              );
            })}

            {selected.deliveryWeeks > 0 && (() => {
              const y = PAD_TOP + steps.length * ROW_H;
              const startX = poX || plantX;
              return (
                <g>
                  <text x={8} y={y + 10} fontSize={8} fill="#388e3c">🚚 Delivery ({selected.deliveryWeeks} wks)</text>
                  <text x={8} y={y + 20} fontSize={7} fill="#aaa">Supplier → site</text>
                  <rect x={startX} y={y + 5} width={Math.max(2, plantX - startX)} height={14} rx={2} fill="#4CAF50" opacity={0.3} />
                </g>
              );
            })()}

            {(() => {
              const i = steps.length + (selected.deliveryWeeks > 0 ? 1 : 0);
              const y = PAD_TOP + i * ROW_H;
              return (
                <g>
                  <text x={8} y={y + 13} fontSize={8} fontWeight={700} fill="#1a3a2a">🌱 Planting Date</text>
                  <rect x={plantX - 4} y={y + 2} width={8} height={22} rx={2} fill={color} opacity={0.9} />
                </g>
              );
            })()}

            <text x={8} y={svgH - 6} fontSize={8} fill="#aaa">
              {isDirty ? '⚠ Unsaved changes — drag bars to reschedule, then Save' : '⟵ Drag bars to reschedule steps (cascades forward)'}
            </text>
          </svg>
        </div>
      </div>
    );
  }

  // ── OVERVIEW MODE ──────────────────────────────────────────────────────────
  const projectEndMs = campaigns.flatMap(c =>
    (c.fundingProjects || []).map(p => p.endDate ? toMs(p.endDate) : null).filter(Boolean)
  );
  const zoomMin = Math.min(...campaigns.map(c => toMs(c.prDeadline)).filter(Boolean));
  const zoomMax = Math.max(...campaigns.map(c => toMs(c.plantingDate)).filter(Boolean), ...projectEndMs);
  const xPos = buildXPos(zoomMin, zoomMax);
  const projectEndMap = buildProjectEndMap(campaigns);
  const months = buildMonths(zoomMin, zoomMax);
  const todayX = xPos(Date.now());
  const svgH = PAD_TOP + campaigns.length * ROW_H + PAD_BOTTOM;

  return (
    <div className="planner-timeline-section">
      <Tooltip tip={tip} />
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
            const prX   = xPos(toMs(c.prDeadline));
            const poX   = c.poDeadline ? xPos(toMs(c.poDeadline)) : null;
            const plantX = xPos(toMs(c.plantingDate));
            const barEndX = poX || plantX;
            const tipLines = [
              c.cropName,
              `PR by: ${formatDate(new Date(c.prDeadline))}`,
              c.poDeadline ? `PO by: ${formatDate(new Date(c.poDeadline))}` : null,
              `Planting: ${formatDate(new Date(c.plantingDate))}`,
              `Status: ${c.status?.replace('_', ' ')}`,
            ].filter(Boolean);

            return (
              <g key={c.id} style={{ cursor: 'pointer' }}
                onClick={() => onSelect(c.id)}
                onMouseEnter={e => { setHoveredRow(c.id); showTip(e, tipLines); }}
                onMouseMove={moveTip}
                onMouseLeave={() => { setHoveredRow(null); hideTip(); }}>
                <rect x={0} y={y} width={SVG_W} height={ROW_H}
                  fill={hoveredRow === c.id ? 'rgba(46,126,46,0.07)' : 'transparent'} />
                <text x={8} y={y + 10} fontSize={9} fontWeight={600}
                  fill={c.status === 'overdue' ? '#c62828' : '#1a3a2a'}>{c.cropName}</text>
                <text x={8} y={y + 20} fontSize={7} fill="#999">
                  PR: {new Date(c.prDeadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                  {c.poDeadline ? `  PO: ${new Date(c.poDeadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}` : ''}
                  {'  🌱 '}{new Date(c.plantingDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                </text>
                <rect x={prX} y={y + 7} width={Math.max(2, barEndX - prX)} height={12} rx={2} fill={color} opacity={0.85} />
                {poX && (
                  <rect x={poX} y={y + 7} width={Math.max(2, plantX - poX)} height={12} rx={2} fill={color} opacity={0.3} />
                )}
                {poX && <DateTick x={poX} y={y + 7} label={new Date(c.poDeadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} color="#e65100" />}
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

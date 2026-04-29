import { useState, useRef } from 'react';
import { formatDate } from '../utils.js';

const LABEL_W = 240;
const ROW_H = 32;
const HEADER_H = 36;
const BAR_H = 12;
const PAD_BOTTOM = 36;
const MS_PER_DAY = 86400000;

function buildMonths(minMs, maxMs) {
  const months = [];
  const d = new Date(minMs); d.setDate(1);
  while (d.getTime() <= maxMs) { months.push(new Date(d)); d.setMonth(d.getMonth() + 1); }
  return months;
}

export default function LoaGantt({ steps, color = '#1a7abf', desiredDate, onDragEnd }) {
  const [tooltip, setTooltip] = useState(null);
  const [draggedSteps, setDraggedSteps] = useState(null);
  const dragRef = useRef(null); // { stepIndex, startX, origMinStartMs, pxPerDay, rangeStartMs }
  const svgRef = useRef(null);

  const displayed = draggedSteps ?? steps;

  // All hooks are above — safe to early-return now
  if (!displayed || displayed.length === 0) return null;

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const first = displayed[0];
  const last = displayed[displayed.length - 1];

  const rangeStartMs = new Date(first.minStart).getTime();
  const candidates = [new Date(last.maxEnd).getTime(), today.getTime()];
  if (desiredDate) candidates.push(new Date(desiredDate).getTime());
  const rawEndMs = Math.max(...candidates);
  const rangeEndMs = rawEndMs + 14 * MS_PER_DAY;

  const totalMs = rangeEndMs - rangeStartMs || 1;
  const calDays = Math.ceil(totalMs / MS_PER_DAY);
  const pxPerDay = Math.min(10, Math.max(4, 700 / calDays));
  const chartW = Math.max(600, Math.ceil(calDays * pxPerDay));
  const svgW = LABEL_W + chartW;
  const svgH = HEADER_H + displayed.length * ROW_H + PAD_BOTTOM;

  function xOf(d) {
    return LABEL_W + chartW * Math.max(0, Math.min(1, (new Date(d).getTime() - rangeStartMs) / totalMs));
  }

  function handleBarMouseDown(e, stepIndex) {
    if (!onDragEnd) return;
    e.preventDefault();
    const svgRect = svgRef.current.getBoundingClientRect();
    dragRef.current = {
      stepIndex,
      startX: e.clientX - svgRect.left,
      origMinStartMs: new Date(steps[stepIndex].minStart).getTime(),
      pxPerDay,
      rangeStartMs,
    };

    function onMove(me) {
      const dr = dragRef.current;
      if (!dr) return;
      const svgR = svgRef.current?.getBoundingClientRect();
      if (!svgR) return;
      const dx = me.clientX - svgR.left - dr.startX;
      const daysDelta = Math.round(dx / dr.pxPerDay);
      if (daysDelta === 0) { setDraggedSteps(null); return; }
      const newMinStart = new Date(dr.origMinStartMs + daysDelta * MS_PER_DAY);
      newMinStart.setHours(0, 0, 0, 0);
      const preview = onDragEnd(dr.stepIndex, newMinStart, true);
      if (preview) setDraggedSteps(preview);
    }

    function onUp(me) {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      const dr = dragRef.current;
      if (dr && svgRef.current) {
        const svgR = svgRef.current.getBoundingClientRect();
        const dx = me.clientX - svgR.left - dr.startX;
        const daysDelta = Math.round(dx / dr.pxPerDay);
        if (daysDelta !== 0) {
          const newMinStart = new Date(dr.origMinStartMs + daysDelta * MS_PER_DAY);
          newMinStart.setHours(0, 0, 0, 0);
          onDragEnd(dr.stepIndex, newMinStart, false);
        }
      }
      dragRef.current = null;
      setDraggedSteps(null);
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  const months = buildMonths(rangeStartMs, rangeEndMs);
  const todayX = xOf(today);
  const showToday = todayX >= LABEL_W && todayX <= svgW;
  const isDragging = dragRef.current !== null;

  return (
    <div style={{ overflowX: 'auto', width: '100%', position: 'relative', userSelect: isDragging ? 'none' : 'auto' }}>
      {/* Floating tooltip */}
      {tooltip && (
        <div style={{
          position: 'absolute', left: tooltip.x + 12, top: Math.max(0, tooltip.y - 10), zIndex: 50,
          background: '#fff', border: '1px solid #ddd', borderRadius: 7, padding: '8px 12px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)', fontSize: 11, pointerEvents: 'none', minWidth: 200, maxWidth: 280,
        }}>
          <div style={{ fontWeight: 700, color: '#1a2e44', marginBottom: 5, lineHeight: 1.3 }}>{tooltip.step.name}</div>
          <div style={{ color: '#555', lineHeight: 1.8 }}>
            <div><span style={{ color: '#888' }}>Earliest start: </span>{formatDate(tooltip.step.minStart)}</div>
            <div><span style={{ color: '#888' }}>Latest end: </span><strong style={{ color }}>{formatDate(tooltip.step.maxEnd)}</strong></div>
            <div><span style={{ color: '#888' }}>Duration: </span>{tooltip.step.minDays}–{tooltip.step.maxDays} working days</div>
          </div>
        </div>
      )}

      <svg ref={svgRef} width={svgW} height={svgH}
        style={{ fontFamily: 'var(--font-body)', display: 'block', minWidth: svgW, cursor: isDragging ? 'grabbing' : 'default' }}
      >
        {/* Header background */}
        <rect x={0} y={0} width={svgW} height={HEADER_H} fill="#f4f7fa" />
        <line x1={0} y1={HEADER_H} x2={svgW} y2={HEADER_H} stroke="#d8e0ea" strokeWidth={1} />
        <line x1={LABEL_W} y1={0} x2={LABEL_W} y2={svgH - PAD_BOTTOM} stroke="#d8e0ea" strokeWidth={1} />
        <text x={8} y={HEADER_H / 2 + 4} fontSize={11} fontWeight="700" fill="#1a2e44">Step</text>

        {/* Row backgrounds */}
        {displayed.map((_, i) => (
          <rect key={`bg-${i}`} x={0} y={HEADER_H + i * ROW_H} width={svgW} height={ROW_H}
            fill={i % 2 === 0 ? '#fff' : '#fafbfc'} />
        ))}

        {/* Month grid lines + labels */}
        {months.map((m, i) => {
          const x = xOf(m);
          if (x <= LABEL_W) return null;
          const nextM = new Date(m); nextM.setMonth(nextM.getMonth() + 1);
          const xNext = xOf(nextM);
          return (
            <g key={i}>
              <line x1={x} x2={x} y1={HEADER_H} y2={svgH - PAD_BOTTOM} stroke="#e8e8e8" strokeWidth={1} />
              <text x={x + Math.min((xNext - x) / 2, 28)} y={HEADER_H / 2 + 4} fontSize={10} fill="#777" fontWeight="600">
                {m.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })}
              </text>
            </g>
          );
        })}

        {/* Today marker */}
        {showToday && (
          <g>
            <line x1={todayX} x2={todayX} y1={HEADER_H} y2={svgH - PAD_BOTTOM} stroke="#1565c0" strokeWidth={1.5} strokeDasharray="4 3" />
            <rect x={todayX - 16} y={HEADER_H + 3} width={32} height={14} fill="#1565c0" rx={3} />
            <text x={todayX} y={HEADER_H + 13} fontSize={8} fill="#fff" textAnchor="middle" fontWeight="700">Today</text>
          </g>
        )}

        {/* Desired date marker */}
        {desiredDate && (() => {
          const dd = new Date(desiredDate); dd.setHours(0, 0, 0, 0);
          const x = xOf(dd);
          if (x <= LABEL_W || x >= svgW - 4) return null;
          const lastMaxEnd = new Date(displayed[displayed.length - 1].maxEnd);
          const dc = lastMaxEnd <= dd ? '#2e7d32' : '#c62828';
          return (
            <g key="desired">
              <line x1={x} x2={x} y1={HEADER_H} y2={svgH - PAD_BOTTOM} stroke={dc} strokeWidth={1.5} strokeDasharray="6 3" />
              <rect x={x - 24} y={HEADER_H + 3} width={48} height={14} fill={dc} rx={3} />
              <text x={x} y={HEADER_H + 13} fontSize={8} fill="#fff" textAnchor="middle" fontWeight="700">Target</text>
            </g>
          );
        })()}

        {/* Step rows */}
        {displayed.map((step, i) => {
          const y = HEADER_H + i * ROW_H;
          const barY = y + (ROW_H - BAR_H) / 2;
          const x1min = xOf(step.minStart);
          const x2min = xOf(step.minEnd);
          const x2max = xOf(step.maxEnd);
          const rangeW = Math.max(2, x2max - x1min);
          const coreX = xOf(step.maxStart);
          const coreW = Math.max(0, x2min - coreX);

          return (
            <g key={step.id || i}>
              <text x={8} y={y + ROW_H / 2 + 4} fontSize={9} fill="#aaa">{i + 1}</text>
              <text x={LABEL_W - 8} y={y + ROW_H / 2 + 4} fontSize={10} fill="#333" textAnchor="end">
                {step.name.length > 32 ? step.name.slice(0, 30) + '…' : step.name}
              </text>

              {/* Range bar (light) */}
              <rect
                x={x1min} y={barY} width={rangeW} height={BAR_H}
                fill={color} opacity={0.22} rx={3}
                style={{ cursor: onDragEnd ? 'grab' : 'default' }}
                onMouseDown={e => handleBarMouseDown(e, i)}
                onMouseEnter={e => {
                  const rect = svgRef.current?.getBoundingClientRect();
                  if (rect) setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, step });
                }}
                onMouseLeave={() => setTooltip(null)}
              />

              {/* Core bar (solid) */}
              {coreW > 0 && (
                <rect
                  x={coreX} y={barY} width={coreW} height={BAR_H}
                  fill={color} opacity={0.85} rx={3}
                  style={{ cursor: onDragEnd ? 'grab' : 'default' }}
                  onMouseDown={e => handleBarMouseDown(e, i)}
                  onMouseEnter={e => {
                    const rect = svgRef.current?.getBoundingClientRect();
                    if (rect) setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, step });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              )}

              {i === displayed.length - 1 && x2max + 60 < svgW && (
                <text x={x2max + 4} y={barY + BAR_H - 1} fontSize={9} fill={color} fontWeight="700">
                  {formatDate(step.maxEnd)}
                </text>
              )}

              <line x1={0} x2={svgW} y1={y + ROW_H} y2={y + ROW_H} stroke="#f0f0f0" strokeWidth={0.5} />
            </g>
          );
        })}

        {/* Axis */}
        <line x1={LABEL_W} x2={svgW} y1={svgH - PAD_BOTTOM} y2={svgH - PAD_BOTTOM} stroke="#ddd" strokeWidth={1} />

        {/* Legend */}
        {(() => {
          const ly = svgH - PAD_BOTTOM + 10;
          return (
            <g>
              <rect x={LABEL_W} y={ly} width={12} height={8} fill={color} opacity={0.85} rx={2} />
              <text x={LABEL_W + 16} y={ly + 7} fontSize={9} fill="#666">Best case</text>
              <rect x={LABEL_W + 72} y={ly} width={12} height={8} fill={color} opacity={0.22} rx={2} />
              <text x={LABEL_W + 88} y={ly + 7} fontSize={9} fill="#666">Worst case buffer</text>
              {onDragEnd && (
                <text x={LABEL_W + 180} y={ly + 7} fontSize={9} fill="#888">Drag bars to adjust timing</text>
              )}
            </g>
          );
        })()}
      </svg>
    </div>
  );
}

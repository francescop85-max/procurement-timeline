import { formatDate } from "../utils";

const LABEL_WIDTH = 220;
const ROW_HEIGHT = 36;
const HEADER_HEIGHT = 38;
const BAR_HEIGHT = 13;
const PX_PER_DAY_MIN = 4;
const PX_PER_DAY_MAX = 10;
const MIN_CHART_WIDTH = 600;

function getMonthBoundaries(startDate, endDate) {
  const months = [];
  const d = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  while (d <= endDate) {
    months.push(new Date(d));
    d.setMonth(d.getMonth() + 1);
  }
  return months;
}

export default function GanttChart({ timeline, proc, prDate, desiredDate, deliveryWeeks, minDeliveryDate, maxDeliveryDate, activeMods, MODIFIERS, status }) {
  if (!timeline || timeline.length === 0) return null;

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const prDateObj = prDate ? new Date(prDate) : today;

  const lastStep = timeline[timeline.length - 1];
  const minPoDate = lastStep.minEnd;
  const maxPoDate = lastStep.maxEnd;

  const hasDelivery = deliveryWeeks > 0 && minDeliveryDate && maxDeliveryDate;

  // X-axis range
  const rangeStart = new Date(prDateObj); rangeStart.setHours(0, 0, 0, 0);
  const candidates = [maxPoDate, today];
  if (hasDelivery) { candidates.push(minDeliveryDate); candidates.push(maxDeliveryDate); }
  if (desiredDate) candidates.push(new Date(desiredDate));
  const rawEnd = new Date(Math.max(...candidates.map(d => d.getTime())));
  const rangeEnd = new Date(rawEnd); rangeEnd.setDate(rangeEnd.getDate() + 14);

  const totalMs = rangeEnd.getTime() - rangeStart.getTime();
  const startMs = rangeStart.getTime();
  const calendarDays = Math.ceil(totalMs / 86400000);

  // Dynamic width: fit to days, capped between min/max px per day
  const pxPerDay = Math.min(PX_PER_DAY_MAX, Math.max(PX_PER_DAY_MIN, MIN_CHART_WIDTH / calendarDays));
  const chartWidth = Math.max(MIN_CHART_WIDTH, Math.ceil(calendarDays * pxPerDay));
  const svgWidth = LABEL_WIDTH + chartWidth;

  function xOf(date) {
    return LABEL_WIDTH + ((date.getTime() - startMs) / totalMs) * chartWidth;
  }

  const totalRows = timeline.length + (hasDelivery ? 1 : 0);
  const svgHeight = HEADER_HEIGHT + totalRows * ROW_HEIGHT + 36;

  const monthBoundaries = getMonthBoundaries(rangeStart, rangeEnd);
  const deadlineColor = status?.type === 'ok' ? '#2e7d32' : status?.type === 'risk' ? '#f57f17' : '#c62828';

  // Show week lines when chart is zoomed enough
  const showWeeks = pxPerDay >= 5;

  return (
    <div style={{ overflowX: 'auto', width: '100%', cursor: 'default' }}>
      <svg
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        style={{ display: 'block' }}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* ── Background ── */}
        <rect x={0} y={0} width={svgWidth} height={svgHeight} fill="#fff" />

        {/* ── Row backgrounds ── */}
        {timeline.map((_, i) => (
          <rect key={`bg-${i}`} x={0} y={HEADER_HEIGHT + i * ROW_HEIGHT} width={svgWidth} height={ROW_HEIGHT}
            fill={i === timeline.length - 1 ? '#f3e8ff' : i % 2 === 0 ? '#fff' : '#fafbfc'} />
        ))}
        {hasDelivery && (
          <rect x={0} y={HEADER_HEIGHT + timeline.length * ROW_HEIGHT} width={svgWidth} height={ROW_HEIGHT} fill="#e3f2fd" />
        )}

        {/* ── Week gridlines (light) ── */}
        {showWeeks && (() => {
          const lines = [];
          const d = new Date(rangeStart);
          // advance to next Monday
          while (d.getDay() !== 1) d.setDate(d.getDate() + 1);
          while (d <= rangeEnd) {
            const x = xOf(d);
            if (x > LABEL_WIDTH) {
              lines.push(<line key={`wk-${d.getTime()}`} x1={x} y1={HEADER_HEIGHT} x2={x} y2={svgHeight - 36} stroke="#f0f0f0" strokeWidth={0.5} />);
            }
            d.setDate(d.getDate() + 7);
          }
          return lines;
        })()}

        {/* ── Month gridlines ── */}
        {monthBoundaries.map((m, i) => {
          const x = xOf(m);
          if (x <= LABEL_WIDTH) return null;
          return <line key={`mg-${i}`} x1={x} y1={HEADER_HEIGHT} x2={x} y2={svgHeight - 36} stroke="#d8e0ea" strokeWidth={1} />;
        })}

        {/* ── Header background ── */}
        <rect x={0} y={0} width={svgWidth} height={HEADER_HEIGHT} fill="#f4f7fa" />
        <line x1={0} y1={HEADER_HEIGHT} x2={svgWidth} y2={HEADER_HEIGHT} stroke="#d8e0ea" strokeWidth={1} />
        <line x1={LABEL_WIDTH} y1={0} x2={LABEL_WIDTH} y2={svgHeight - 36} stroke="#d8e0ea" strokeWidth={1} />

        {/* ── Header labels (drawn after header rect so they're visible) ── */}
        <text x={8} y={HEADER_HEIGHT / 2 + 4} fontSize={11} fontWeight="700" fill="#1a2e44" fontFamily="Inter, sans-serif">Phase</text>
        {monthBoundaries.map((m, i) => {
          const x = xOf(m);
          if (x <= LABEL_WIDTH) return null;
          const nextM = new Date(m); nextM.setMonth(nextM.getMonth() + 1);
          const xNext = xOf(nextM);
          const colW = xNext - x;
          const label = m.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
          return (
            <g key={`mh-${i}`}>
              <text x={x + Math.min(colW / 2, 30)} y={HEADER_HEIGHT / 2 + 4} fontSize={10} fontWeight="600" fill="#555" fontFamily="Inter, sans-serif">{label}</text>
            </g>
          );
        })}

        {/* ── Step rows ── */}
        {timeline.map((step, i) => {
          const isExtra = activeMods?.some(k => {
            const m = MODIFIERS?.find(md => md.key === k);
            return m?.addStep?.name === step.name;
          });
          const isLast = i === timeline.length - 1;
          const color = isExtra ? '#f57c00' : proc.color;
          const y = HEADER_HEIGHT + i * ROW_HEIGHT;
          const barY = y + (ROW_HEIGHT - BAR_HEIGHT) / 2;
          const xStart = xOf(step.minStart);
          const xMinEnd = xOf(step.minEnd);
          const xMaxEnd = xOf(step.maxEnd);
          const solidW = Math.max(2, xMinEnd - xStart);
          const bufferW = Math.max(0, xMaxEnd - xMinEnd);
          const label = step.name.length > 30 ? step.name.slice(0, 28) + '…' : step.name;
          return (
            <g key={`row-${i}`}>
              <circle cx={14} cy={y + ROW_HEIGHT / 2} r={9} fill={color} opacity={isLast ? 1 : 0.85} />
              <text x={14} y={y + ROW_HEIGHT / 2 + 4} textAnchor="middle" fontSize={8} fill="#fff" fontWeight="700" fontFamily="Inter, sans-serif">{i + 1}</text>
              <text x={28} y={y + ROW_HEIGHT / 2 + 4} fontSize={10} fill={isLast ? '#1a2e44' : '#444'} fontWeight={isLast ? '700' : '500'} fontFamily="Inter, sans-serif">{label}</text>
              <rect x={xStart} y={barY} width={solidW} height={BAR_HEIGHT} fill={color} rx={2} opacity={0.9} />
              {bufferW > 0 && <rect x={xMinEnd} y={barY} width={bufferW} height={BAR_HEIGHT} fill={color} rx={2} opacity={0.22} />}
              {isLast && xMaxEnd + 60 < svgWidth && (
                <text x={xMaxEnd + 4} y={barY + BAR_HEIGHT - 1} fontSize={9} fill={proc.color} fontWeight="700" fontFamily="Inter, sans-serif">{formatDate(step.maxEnd)}</text>
              )}
              <line x1={0} y1={y + ROW_HEIGHT} x2={svgWidth} y2={y + ROW_HEIGHT} stroke="#f0f0f0" strokeWidth={1} />
            </g>
          );
        })}

        {/* ── Delivery row ── */}
        {hasDelivery && (() => {
          const i = timeline.length;
          const y = HEADER_HEIGHT + i * ROW_HEIGHT;
          const barY = y + (ROW_HEIGHT - BAR_HEIGHT) / 2;
          const xStart = xOf(minPoDate);
          const xEnd = xOf(minDeliveryDate);
          const xMaxEnd = xOf(maxDeliveryDate);
          const solidW = Math.max(2, xEnd - xStart);
          const bufferW = Math.max(0, xMaxEnd - xEnd);
          const isWorks = deliveryWeeks > 8; // rough heuristic; could pass isWorks prop
          return (
            <g key="delivery">
              <circle cx={14} cy={y + ROW_HEIGHT / 2} r={9} fill="#1565c0" />
              <text x={14} y={y + ROW_HEIGHT / 2 + 4} textAnchor="middle" fontSize={8} fill="#fff" fontWeight="700" fontFamily="Inter, sans-serif">D</text>
              <text x={28} y={y + ROW_HEIGHT / 2 + 4} fontSize={10} fill="#1565c0" fontWeight="600" fontFamily="Inter, sans-serif">
                Delivery Period ({deliveryWeeks}w)
              </text>
              <rect x={xStart} y={barY} width={solidW} height={BAR_HEIGHT} fill="#1976d2" rx={2} opacity={0.7} />
              {bufferW > 0 && <rect x={xEnd} y={barY} width={bufferW} height={BAR_HEIGHT} fill="#1976d2" rx={2} opacity={0.2} />}
              <line x1={0} y1={y + ROW_HEIGHT} x2={svgWidth} y2={y + ROW_HEIGHT} stroke="#f0f0f0" strokeWidth={1} />
            </g>
          );
        })()}

        {/* ── Today marker ── */}
        {(() => {
          const x = xOf(today);
          if (x <= LABEL_WIDTH || x >= svgWidth - 5) return null;
          return (
            <g key="today">
              <line x1={x} y1={HEADER_HEIGHT} x2={x} y2={HEADER_HEIGHT + totalRows * ROW_HEIGHT} stroke="#1565c0" strokeWidth={1.5} strokeDasharray="4,3" />
              <rect x={x - 16} y={HEADER_HEIGHT + 3} width={32} height={14} fill="#1565c0" rx={3} />
              <text x={x} y={HEADER_HEIGHT + 13} textAnchor="middle" fontSize={8} fill="#fff" fontWeight="700" fontFamily="Inter, sans-serif">Today</text>
            </g>
          );
        })()}

        {/* ── Desired date marker ── */}
        {desiredDate && (() => {
          const dd = new Date(desiredDate); dd.setHours(0, 0, 0, 0);
          const x = xOf(dd);
          if (x <= LABEL_WIDTH || x >= svgWidth - 5) return null;
          return (
            <g key="deadline">
              <line x1={x} y1={HEADER_HEIGHT} x2={x} y2={HEADER_HEIGHT + totalRows * ROW_HEIGHT} stroke={deadlineColor} strokeWidth={1.5} strokeDasharray="6,3" />
              <rect x={x - 22} y={HEADER_HEIGHT + 3} width={44} height={14} fill={deadlineColor} rx={3} />
              <text x={x} y={HEADER_HEIGHT + 13} textAnchor="middle" fontSize={8} fill="#fff" fontWeight="700" fontFamily="Inter, sans-serif">Deadline</text>
            </g>
          );
        })()}

        {/* ── Legend ── */}
        {(() => {
          const ly = HEADER_HEIGHT + totalRows * ROW_HEIGHT + 10;
          return (
            <g key="legend">
              <rect x={LABEL_WIDTH} y={ly} width={12} height={9} fill={proc.color} rx={2} opacity={0.9} />
              <text x={LABEL_WIDTH + 16} y={ly + 8} fontSize={9} fill="#666" fontFamily="Inter, sans-serif">Best case</text>
              <rect x={LABEL_WIDTH + 74} y={ly} width={12} height={9} fill={proc.color} rx={2} opacity={0.22} />
              <text x={LABEL_WIDTH + 90} y={ly + 8} fontSize={9} fill="#666" fontFamily="Inter, sans-serif">Worst case buffer</text>
              <line x1={LABEL_WIDTH + 188} y1={ly + 4} x2={LABEL_WIDTH + 200} y2={ly + 4} stroke="#1565c0" strokeWidth={1.5} strokeDasharray="4,2" />
              <text x={LABEL_WIDTH + 204} y={ly + 8} fontSize={9} fill="#666" fontFamily="Inter, sans-serif">Today</text>
              {desiredDate && (
                <>
                  <line x1={LABEL_WIDTH + 238} y1={ly + 4} x2={LABEL_WIDTH + 250} y2={ly + 4} stroke={deadlineColor} strokeWidth={1.5} strokeDasharray="6,2" />
                  <text x={LABEL_WIDTH + 254} y={ly + 8} fontSize={9} fill="#666" fontFamily="Inter, sans-serif">Deadline</text>
                </>
              )}
            </g>
          );
        })()}
      </svg>
    </div>
  );
}

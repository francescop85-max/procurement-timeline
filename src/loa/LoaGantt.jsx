import { formatDate } from '../utils.js';

const LABEL_W = 240;
const ROW_H = 30;
const PAD_TOP = 24;
const PAD_BOTTOM = 36;
const BAR_H = 12;
const MS_PER_DAY = 86400000;

function buildMonths(minMs, maxMs) {
  const months = [];
  const d = new Date(minMs); d.setDate(1);
  while (d.getTime() <= maxMs) { months.push(new Date(d)); d.setMonth(d.getMonth() + 1); }
  return months;
}

export default function LoaGantt({ steps, color = '#1a7abf' }) {
  if (!steps || steps.length === 0) return null;

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const first = steps[0];
  const last = steps[steps.length - 1];

  const rangeStartMs = new Date(first.minStart).getTime();
  const rawEndMs = Math.max(new Date(last.maxEnd).getTime(), today.getTime());
  const rangeEndMs = rawEndMs + 14 * MS_PER_DAY;

  const totalMs = rangeEndMs - rangeStartMs || 1;
  const calDays = Math.ceil(totalMs / MS_PER_DAY);
  const pxPerDay = Math.min(10, Math.max(4, 700 / calDays));
  const chartW = Math.max(600, Math.ceil(calDays * pxPerDay));
  const svgW = LABEL_W + chartW;
  const svgH = PAD_TOP + steps.length * ROW_H + PAD_BOTTOM;

  function xOf(d) {
    return LABEL_W + chartW * Math.max(0, Math.min(1, (new Date(d).getTime() - rangeStartMs) / totalMs));
  }

  const months = buildMonths(rangeStartMs, rangeEndMs);
  const todayX = xOf(today);
  const showToday = todayX >= LABEL_W && todayX <= svgW;

  return (
    <div style={{ overflowX: 'auto', width: '100%' }}>
      <svg width={svgW} height={svgH} style={{ fontFamily: 'var(--font-body)', display: 'block', minWidth: svgW }}>
        {/* Month grid */}
        {months.map((m, i) => {
          const x = xOf(m);
          return (
            <g key={i}>
              <line x1={x} x2={x} y1={PAD_TOP} y2={svgH - PAD_BOTTOM} stroke="#e8e8e8" strokeWidth={1} />
              <text x={x} y={14} fontSize={9} fill="#bbb" textAnchor="middle">
                {m.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })}
              </text>
            </g>
          );
        })}

        {/* Today marker */}
        {showToday && (
          <g>
            <line x1={todayX} x2={todayX} y1={PAD_TOP} y2={svgH - PAD_BOTTOM} stroke="#e53935" strokeWidth={1.5} strokeDasharray="4 3" />
            <text x={todayX} y={PAD_TOP - 4} fontSize={8} fill="#e53935" textAnchor="middle">today</text>
          </g>
        )}

        {/* Steps */}
        {steps.map((step, i) => {
          const y = PAD_TOP + i * ROW_H;
          const barY = y + (ROW_H - BAR_H) / 2;
          const x1min = xOf(step.minStart);
          const x1max = xOf(step.maxStart);
          const x2min = xOf(step.minEnd);
          const x2max = xOf(step.maxEnd);

          // Range bar (light): from earliest start to latest end
          const rangeX = x1min;
          const rangeW = Math.max(2, x2max - x1min);
          // Core bar (solid): from latest start to earliest end (the certain window)
          const coreX = x1max;
          const coreW = Math.max(0, x2min - x1max);

          return (
            <g key={step.id || i}>
              {/* Label */}
              <text
                x={LABEL_W - 6}
                y={y + ROW_H / 2 + 4}
                fontSize={10}
                fill="#333"
                textAnchor="end"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                <title>{step.name}</title>
                {step.name.length > 30 ? step.name.slice(0, 28) + '…' : step.name}
              </text>

              {/* Range bar */}
              <rect x={rangeX} y={barY} width={rangeW} height={BAR_H} fill={color} opacity={0.25} rx={3} />

              {/* Core bar */}
              {coreW > 0 && (
                <rect x={coreX} y={barY} width={coreW} height={BAR_H} fill={color} opacity={0.85} rx={3} />
              )}

              {/* Min end date label */}
              <text x={x2min + 3} y={barY + BAR_H - 1} fontSize={8} fill={color} opacity={0.9}>
                {formatDate(step.minEnd)}
              </text>

              {/* Row separator */}
              <line x1={0} x2={svgW} y1={y + ROW_H} y2={y + ROW_H} stroke="#f0f0f0" strokeWidth={0.5} />
            </g>
          );
        })}

        {/* Axis line */}
        <line x1={LABEL_W} x2={svgW} y1={svgH - PAD_BOTTOM} y2={svgH - PAD_BOTTOM} stroke="#ddd" strokeWidth={1} />
      </svg>
    </div>
  );
}

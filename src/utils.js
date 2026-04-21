function iso(d) {
  return new Date(d).toLocaleDateString('sv'); // 'YYYY-MM-DD'
}

function isNonWorking(d, holidays) {
  const day = d.getDay();
  return day === 0 || day === 6 || holidays.has(iso(d));
}

export function addWorkingDays(date, days, holidays = new Set()) {
  if (days === 0) return new Date(date);
  let d = new Date(date), added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    if (!isNonWorking(d, holidays)) added++;
  }
  return d;
}

export function subtractWorkingDays(date, days, holidays = new Set()) {
  let d = new Date(date), sub = 0;
  while (sub < days) {
    d.setDate(d.getDate() - 1);
    if (!isNonWorking(d, holidays)) sub++;
  }
  return d;
}

export function countWorkingDays(from, to, holidays = new Set()) {
  let d = new Date(from), count = 0;
  while (d < to) {
    d.setDate(d.getDate() + 1);
    if (!isNonWorking(d, holidays)) count++;
  }
  return count;
}

export function formatDate(d) {
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function toISO(d) {
  return new Date(d).toLocaleDateString('sv');
}

export function buildSteps(procKey, activeMods, PROCESSES, MODIFIERS) {
  let steps = PROCESSES[procKey].steps.map(s => ({ ...s }));
  activeMods.forEach(modKey => {
    const mod = MODIFIERS.find(m => m.key === modKey);
    if (!mod || !mod.applicable.includes(procKey)) return;
    const ns = { ...mod.addStep, minDays: mod.minDays, maxDays: mod.maxDays };
    if (mod.insertBeforeLast) {
      steps.splice(steps.length - 1, 0, ns);
    } else if (mod.insertAfter) {
      const i = steps.findIndex(s => s.name === mod.insertAfter);
      i >= 0 ? steps.splice(i + 1, 0, ns) : steps.push(ns);
    } else if (mod.insertBefore) {
      const names = Array.isArray(mod.insertBefore) ? mod.insertBefore : [mod.insertBefore];
      let i = -1;
      for (const name of names) {
        i = steps.findIndex(s => s.name === name);
        if (i >= 0) break;
      }
      i >= 0 ? steps.splice(i, 0, ns) : steps.unshift(ns);
    }
  });
  return steps;
}

export function addCalendarDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function computeTimeline(steps, startDate, holidays = new Set()) {
  let minCur = new Date(startDate);
  let maxCur = new Date(startDate);
  return steps.map(step => {
    const minStart = new Date(minCur);
    const maxStart = new Date(maxCur);
    const addDays = step.calendarDays
      ? (d, n) => addCalendarDays(d, n)
      : (d, n) => addWorkingDays(d, n, holidays);
    const minEnd = addDays(minStart, step.minDays);
    const maxEnd = addDays(maxStart, step.maxDays);
    minCur = new Date(minEnd);
    maxCur = new Date(maxEnd);
    return { ...step, minStart, maxStart, minEnd, maxEnd };
  });
}

// ── Tracking / Monitor utilities ────────────────────────────────────────────

/**
 * Rolling-forecast timeline: completed steps use their actual end date as the
 * cursor for downstream steps. Future steps cascade pessimistically (maxDays).
 * Returns the same shape as computeTimeline, plus `locked` and `actualEnd`.
 */
export function computeTrackingTimeline(steps, prDate, actuals = {}, holidays = new Set()) {
  let cursor = new Date(prDate);
  // Also keep a min-cursor for the optimistic path on unlocked steps
  let minCursor = new Date(prDate);

  return steps.map((step, i) => {
    const actual = actuals[i];
    const addDays = step.calendarDays
      ? (d, n) => addCalendarDays(d, n)
      : (d, n) => addWorkingDays(d, n, holidays);

    if (actual?.actualEnd) {
      const actualEndDate = new Date(actual.actualEnd);
      const result = {
        ...step,
        minStart: new Date(cursor),
        maxStart: new Date(cursor),
        minEnd: actualEndDate,
        maxEnd: actualEndDate,
        actualEnd: actualEndDate,
        locked: true,
      };
      cursor = actualEndDate;
      minCursor = actualEndDate;
      return result;
    } else {
      const minEnd = addDays(new Date(minCursor), step.minDays);
      const maxEnd = addDays(new Date(cursor), step.maxDays);
      const result = {
        ...step,
        minStart: new Date(minCursor),
        maxStart: new Date(cursor),
        minEnd,
        maxEnd,
        locked: false,
      };
      minCursor = minEnd;
      cursor = maxEnd;
      return result;
    }
  });
}

/** Derive per-step status for display in the tracking table. */
export function deriveStepStatus(step, today) {
  if (step.locked) {
    // Compare actual against original planned maxEnd stored in step
    return step.actualEnd <= step._originalMaxEnd ? 'on_time' : 'late';
  }
  if (today <= step.minEnd) return 'not_started';
  if (today <= step.maxEnd) return 'in_progress';
  return 'overdue';
}

/**
 * Compare the last step's maxEnd in the tracking timeline vs the original
 * planned timeline to derive overall procurement status.
 */
export function computeOverallStatus(trackingTimeline, originalTimeline, today) {
  const allDone = trackingTimeline.every(s => s.locked);
  const lastTracked = trackingTimeline[trackingTimeline.length - 1].maxEnd;
  const lastOriginal = originalTimeline[originalTimeline.length - 1].maxEnd;

  if (allDone) return { type: 'completed', delayDays: 0 };

  // Count working days difference (positive = delay, negative = ahead)
  const delta = countWorkingDays(lastOriginal, lastTracked);
  if (delta <= 0) return { type: 'on_track', aheadDays: Math.abs(delta) };
  return { type: 'delayed', delayDays: delta };
}

/** Stable short ID for a plan config — used as localStorage key. */
export function derivePlanId(cfg) {
  const raw = [cfg.selected, cfg.prDate, ...(cfg.activeMods || [])].join('|');
  // Simple deterministic hash (djb2)
  let h = 5381;
  for (let i = 0; i < raw.length; i++) h = ((h << 5) + h) ^ raw.charCodeAt(i);
  return (h >>> 0).toString(36);
}

/** Encode a plan snapshot into a URL-safe base64 string. */
export function encodePlanToHash(snapshot) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(snapshot))));
}

/** Decode a plan snapshot from a base64 string. Returns null on failure. */
export function decodePlanFromHash(str) {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(str))));
  } catch {
    return null;
  }
}

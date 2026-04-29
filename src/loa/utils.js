import { addWorkingDays, subtractWorkingDays, formatDate } from '../utils.js';

export function computeRequiredStartDate(steps, targetDate, holidays = new Set()) {
  const totalMaxDays = steps.reduce((s, st) => s + st.maxDays, 0);
  return subtractWorkingDays(new Date(targetDate), totalMaxDays, holidays);
}

export function recomputeStepsFrom(steps, fromIndex, newMinStart, holidays = new Set()) {
  const result = steps.slice();
  const s = result[fromIndex];
  const origMin = new Date(s.minStart);
  const delta = newMinStart.getTime() - origMin.getTime();
  const newMaxStart = new Date(new Date(s.maxStart).getTime() + delta);
  const newMinEnd = addWorkingDays(newMinStart, s.minDays, holidays);
  const newMaxEnd = addWorkingDays(newMaxStart, s.maxDays, holidays);
  result[fromIndex] = { ...s, minStart: newMinStart, maxStart: newMaxStart, minEnd: newMinEnd, maxEnd: newMaxEnd };
  for (let i = fromIndex + 1; i < result.length; i++) {
    const prev = result[i - 1];
    const cur = result[i];
    const minS = new Date(prev.minEnd);
    const maxS = new Date(prev.maxEnd);
    result[i] = { ...cur, minStart: minS, maxStart: maxS, minEnd: addWorkingDays(minS, cur.minDays, holidays), maxEnd: addWorkingDays(maxS, cur.maxDays, holidays) };
  }
  return result;
}

export function computeLoaTimeline(steps, startDate, holidays = new Set()) {
  let minCur = new Date(startDate);
  let maxCur = new Date(startDate);
  return steps.map(step => {
    const minStart = new Date(minCur);
    const maxStart = new Date(maxCur);
    const minEnd = addWorkingDays(minStart, step.minDays, holidays);
    const maxEnd = addWorkingDays(maxStart, step.maxDays, holidays);
    minCur = new Date(minEnd);
    maxCur = new Date(maxEnd);
    return { ...step, minStart, maxStart, minEnd, maxEnd };
  });
}

export function computeLoaStatus(plan) {
  if (!plan.steps?.length) return 'unknown';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const lastStep = plan.steps[plan.steps.length - 1];
  const maxEnd = new Date(lastStep.maxEnd);
  const minEnd = new Date(lastStep.minEnd);
  if (today <= minEnd) return 'on_track';
  if (today <= maxEnd) return 'at_risk';
  return 'overdue';
}

export { formatDate };

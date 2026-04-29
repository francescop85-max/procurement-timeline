import { addWorkingDays, formatDate } from '../utils.js';

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

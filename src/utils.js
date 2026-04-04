export function addWorkingDays(date, days) {
  if (days === 0) return new Date(date);
  let d = new Date(date), added = 0;
  while (added < days) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0 && d.getDay() !== 6) added++; }
  return d;
}

export function subtractWorkingDays(date, days) {
  let d = new Date(date), sub = 0;
  while (sub < days) { d.setDate(d.getDate() - 1); if (d.getDay() !== 0 && d.getDay() !== 6) sub++; }
  return d;
}

export function countWorkingDays(from, to) {
  let d = new Date(from), count = 0;
  while (d < to) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0 && d.getDay() !== 6) count++; }
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

export function computeTimeline(steps, startDate) {
  let minCur = new Date(startDate);
  let maxCur = new Date(startDate);
  return steps.map(step => {
    const minStart = new Date(minCur);
    const maxStart = new Date(maxCur);
    const minEnd = addWorkingDays(minStart, step.minDays);
    const maxEnd = addWorkingDays(maxStart, step.maxDays);
    minCur = new Date(minEnd);
    maxCur = new Date(maxEnd);
    return { ...step, minStart, maxStart, minEnd, maxEnd };
  });
}

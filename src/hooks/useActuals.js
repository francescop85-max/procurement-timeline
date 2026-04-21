import { useState, useCallback } from "react";

const STORAGE_PREFIX = "procurement_actuals_";

function loadFromStorage(planId) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + planId);
    return raw ? JSON.parse(raw).steps : {};
  } catch {
    return {};
  }
}

function saveToStorage(planId, steps) {
  try {
    localStorage.setItem(
      STORAGE_PREFIX + planId,
      JSON.stringify({ planId, updatedAt: new Date().toISOString(), steps })
    );
  } catch {
    // localStorage may be unavailable (private browsing quota exceeded etc.)
  }
}

/**
 * Hook that manages actual step completion dates for a given plan.
 * actuals: { [stepIndex]: { actualEnd: "YYYY-MM-DD" } }
 */
export function useActuals(planId) {
  const [actuals, setActuals] = useState(() =>
    planId ? loadFromStorage(planId) : {}
  );

  const updateActual = useCallback(
    (stepIndex, entry) => {
      setActuals(prev => {
        const next = entry
          ? { ...prev, [stepIndex]: { ...prev[stepIndex], ...entry } }
          : Object.fromEntries(Object.entries(prev).filter(([k]) => Number(k) !== stepIndex));
        if (planId) saveToStorage(planId, next);
        return next;
      });
    },
    [planId]
  );

  const clearActuals = useCallback(() => {
    setActuals({});
    if (planId) {
      try { localStorage.removeItem(STORAGE_PREFIX + planId); } catch {}
    }
  }, [planId]);

  return { actuals, updateActual, clearActuals };
}

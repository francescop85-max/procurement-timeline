import { useState, useEffect, useCallback } from "react";

/**
 * Manages the shared list of monitored plans via the /api/plans serverless endpoint.
 * The list is stored in Vercel Blob and accessible to all users.
 */
export function useMonitoredPlans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/plans")
      .then(r => r.ok ? r.json() : [])
      .then(setPlans)
      .catch(() => setPlans([]))
      .finally(() => setLoading(false));
  }, []);

  const savePlan = useCallback(async (planId, url, snapshot) => {
    const entry = { planId, url, snapshot, savedAt: new Date().toISOString() };
    // Optimistic update
    setPlans(prev => [entry, ...prev.filter(p => p.planId !== planId)]);
    await fetch("/api/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    }).catch(() => {});
  }, []);

  const removePlan = useCallback(async (planId) => {
    setPlans(prev => prev.filter(p => p.planId !== planId));
    await fetch(`/api/plans?planId=${encodeURIComponent(planId)}`, {
      method: "DELETE",
    }).catch(() => {});
  }, []);

  return { plans, loading, savePlan, removePlan };
}

import { useState, useEffect } from 'react';

export function useLoaPlans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/loa-plans')
      .then(r => r.json())
      .then(setPlans)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function savePlan(plan) {
    await fetch('/api/loa-plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(plan),
    });
    setPlans(prev => [plan, ...prev.filter(p => p.id !== plan.id)]);
  }

  async function deletePlan(id) {
    await fetch(`/api/loa-plans?id=${id}`, { method: 'DELETE' });
    setPlans(prev => prev.filter(p => p.id !== id));
  }

  return { plans, loading, error, savePlan, deletePlan };
}

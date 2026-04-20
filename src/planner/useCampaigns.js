import { useState, useEffect } from 'react';

export function useCampaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/campaigns')
      .then(r => r.json())
      .then(setCampaigns)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function saveCampaign(campaign) {
    await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(campaign),
    });
    setCampaigns(prev => [campaign, ...prev.filter(c => c.id !== campaign.id)]);
  }

  async function deleteCampaign(id) {
    await fetch(`/api/campaigns?id=${id}`, { method: 'DELETE' });
    setCampaigns(prev => prev.filter(c => c.id !== id));
  }

  return { campaigns, loading, error, saveCampaign, deleteCampaign };
}

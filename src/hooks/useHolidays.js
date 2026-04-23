import { useState, useEffect } from 'react';

export function useHolidays(countryCode = 'UA') {
  const [holidays, setHolidays] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setError(null);
    const currentYear = new Date().getFullYear();
    const years = [currentYear, currentYear + 1, currentYear + 2];

    Promise.all(
      years.map(year =>
        fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`, { signal: controller.signal })
          .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      )
    )
      .then(results => {
        const allDates = new Set();
        results.flat().forEach(h => h.date && allDates.add(h.date));
        setHolidays(allDates);
        setLoading(false);
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          setError(err.message);
          setHolidays(new Set());
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [countryCode]);

  return { holidays, loading, error };
}

import { useState, useEffect } from 'react';

export function useHolidays() {
  const [holidays, setHolidays] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const years = [currentYear, currentYear + 1, currentYear + 2];

    Promise.all(
      years.map(year =>
        fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/UA`)
          .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      )
    )
      .then(results => {
        const allDates = new Set();
        results.flat().forEach(h => allDates.add(h.date)); // 'YYYY-MM-DD'
        setHolidays(allDates);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false); // silently fall back to weekend-only
      });
  }, []);

  return { holidays, loading, error };
}

import React, { useState, useEffect } from 'react';

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/summary')
      .then(r => r.json())
      .then(d => {
        if (d.success) setSummary(d.data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="spinner" />;
  if (!summary) return <div>Failed to load summary</div>;

  return (
    <div className="animate-fade-in-up content-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
      <div className="stat-card">
        <span className="stat-card__label">Data Quality Score</span>
        <span className="stat-card__value" style={{ color: summary.data_quality_score > 90 ? 'var(--color-success)' : summary.data_quality_score > 70 ? 'var(--color-warning)' : 'var(--color-error)' }}>
          {summary.data_quality_score}%
        </span>
        <span className="stat-card__change stat-card__change--neutral">across {summary.total_loans} records</span>
      </div>
      
      <div className="stat-card">
        <span className="stat-card__label">Fully Verified Loans</span>
        <span className="stat-card__value">{summary.verified_loans}</span>
        <span className="stat-card__change stat-card__change--positive">Safe to underwrite</span>
      </div>

      <div className="stat-card" style={{ borderColor: summary.open_exceptions > 0 ? 'var(--color-warning)' : 'var(--color-success)' }}>
        <span className="stat-card__label">Open Exceptions</span>
        <span className="stat-card__value">{summary.open_exceptions}</span>
        <span className="stat-card__change stat-card__change--negative">Requires manual review</span>
      </div>

      <div className="stat-card">
        <span className="stat-card__label">Upload Batches</span>
        <span className="stat-card__value">{summary.uploads_count}</span>
        <span className="stat-card__change stat-card__change--neutral">total tapes ingested</span>
      </div>
    </div>
  );
}

import React from 'react';
import { Project } from '../types/project';

interface Props {
  project: Project;
}

export function CostTypeChart({ project }: Props) {
  if (!project.costTypes || project.costTypes.length === 0) {
    return (
      <div className="card">
        <div className="card-title">
          <span className="icon" style={{ background: '#3b82f6' }} />
          IST-Kosten nach Kostenart
        </div>
        <div className="empty-state" style={{ padding: '20px 0' }}>
          <p>Keine Kostenart-Aufteilung vorhanden</p>
        </div>
      </div>
    );
  }

  const maxVal = Math.max(...project.costTypes.map((c) => c.amount));

  return (
    <div className="card">
      <div className="card-title">
        <span className="icon" style={{ background: '#3b82f6' }} />
        IST-Kosten nach Kostenart
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {project.costTypes.map((ct, idx) => {
          const widthPct = maxVal > 0 ? (ct.amount / maxVal) * 100 : 0;
          return (
            <div key={idx} className="cost-type-row">
              <div className="cost-type-dot" style={{ background: ct.color }} />
              <div className="cost-type-name">{ct.name}</div>
              <div className="cost-type-bar">
                <div className="cost-type-bar-fill" style={{ width: `${widthPct}%`, background: ct.color }} />
              </div>
              <div className="cost-type-amount">{ct.amount.toLocaleString('de-DE')} €</div>
              <div className="cost-type-pct">{ct.percentage.toFixed(1)}%</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

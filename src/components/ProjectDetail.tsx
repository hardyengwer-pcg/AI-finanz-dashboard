import React from 'react';
import { Project, isOrderForProject } from '../types/project';
import { OpenOrder } from '../types/openOrder';
import { PlanIstChart } from './PlanIstChart';
import { CostTypeChart } from './CostTypeChart';
import { OpenOrdersTable } from './OpenOrdersTable';
import { UncertaintyList } from './UncertaintyList';

interface Props {
  project: Project;
  openOrders: OpenOrder[];
}

export function ProjectDetail({ project, openOrders }: Props) {
  const openOrdersTotal = openOrders
    .filter((o) => isOrderForProject(o, project))
    .reduce((sum, o) => sum + o.amount, 0);

  const totalCommitted = project.budgetIst + openOrdersTotal;
  const isOver = totalCommitted > project.budgetPlan;
  const budgetAusschopfung = project.budgetPlan > 0 ? (totalCommitted / project.budgetPlan) * 100 : 0;
  const saving = project.budgetPlan - totalCommitted;

  // Collect uncertainties
  const uncertainties = project.aiAnalysis?.uncertainties || [];

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Budget KPIs */}
      <div className="kpi-grid">
        <div className="kpi-card blue">
          <div className="kpi-icon">📋</div>
          <div className="kpi-value">{project.budgetPlan.toLocaleString('de-DE')} €</div>
          <div className="kpi-label">Gesamtbudget (Plan)</div>
          <div className="kpi-sub">Genehmigter Projektantrag</div>
        </div>

        <div className="kpi-card green">
          <div className="kpi-icon">💸</div>
          <div className="kpi-value">{project.budgetIst.toLocaleString('de-DE')} €</div>
          <div className="kpi-label">IST-Kosten Gesamt</div>
          <div className="kpi-sub">Tatsächliche Ausgaben</div>
        </div>

        <div className="kpi-card purple">
          <div className="kpi-icon">📊</div>
          <div className="kpi-value">{budgetAusschopfung.toFixed(1)} %</div>
          <div className="kpi-label">Budgetausschöpfung</div>
          <div style={{ marginTop: '6px' }}>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{
                  width: `${Math.min(budgetAusschopfung, 100)}%`,
                  background: isOver ? 'var(--red)' : 'var(--blue)'
                }}
              />
            </div>
          </div>
        </div>

        <div className={`kpi-card ${isOver ? 'red' : 'green'}`}>
          <div className="kpi-icon">{isOver ? '🚨' : '💰'}</div>
          <div className="kpi-value">{Math.abs(saving).toLocaleString('de-DE')} €</div>
          <div className="kpi-label">{isOver ? 'Budgetüberschreitung' : 'Budgeteinsparung'}</div>
          <div className="kpi-sub">{isOver ? 'Kritischer Bereich' : 'Nicht verbrauchtes Budget'}</div>
        </div>
      </div>

      {/* Uncertainty Warnings first if any exist */}
      {uncertainties.length > 0 && (
        <UncertaintyList uncertainties={uncertainties} />
      )}

      {/* Charts layout */}
      <div className="charts-row">
        <PlanIstChart project={project} openOrders={openOrders} />
        <CostTypeChart project={project} />
      </div>

      {/* AI text insights if available */}
      {project.aiAnalysis?.summary && (
        <div className="card">
          <div className="card-title">
            <span className="icon" style={{ background: 'var(--purple)' }} />
            🤖 KI-Projekt-Zusammenfassung & Einschätzung
          </div>
          <p style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--text-primary)' }}>
            {project.aiAnalysis.summary}
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', fontSize: '11px', color: 'var(--text-muted)' }}>
            <span>Konfidenzlevel der KI: {(project.aiAnalysis.confidence * 100).toFixed(0)}%</span>
            <span>Generiert am: {new Date(project.aiAnalysis.analyzedAt).toLocaleString('de-DE')}</span>
          </div>
        </div>
      )}

      {/* Open Orders manager */}
      <OpenOrdersTable orders={openOrders} project={project} />
    </div>
  );
}

import React from 'react';
import { useDashboardStore } from '../store/dashboardStore';

export function Header() {
  const { projects, selectedProjectId } = useDashboardStore();

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  const title = selectedProject ? selectedProject.name : 'Buchungsabgleich COOR ↔ Sage';
  const subtitle = selectedProject
    ? `${selectedProject.location || 'Verkehrszentrum'} • Stand: ${selectedProject.lastUpdated}`
    : `Übergreifende Analyse von ${projects.length} Projekten • Stand: ${new Date().toLocaleDateString('de-DE')}`;

  const getStatusText = (status?: string) => {
    if (status === 'im_rahmen') return 'Projekt abgeschlossen • Im Rahmen';
    if (status === 'ueberschreitung') return 'Überschreitung';
    return 'Laufend';
  };

  return (
    <header className="main-header">
      <div className="main-header-left">
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>

      <div className="main-header-right">
        {selectedProject ? (
          <>
            <span className={`status-badge ${selectedProject.status}`}>
              {getStatusText(selectedProject.status)}
            </span>
            <div className="project-number-badge">
              <div className="label">Projektnummer</div>
              <div className="value">{selectedProject.number}</div>
            </div>
          </>
        ) : (
          <div className="project-number-badge">
            <div className="label">Aktive Projekte</div>
            <div className="value" style={{ color: 'var(--blue)' }}>{projects.length}</div>
          </div>
        )}
      </div>
    </header>
  );
}

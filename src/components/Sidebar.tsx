import { useDashboardStore } from '../store/dashboardStore';

export function Sidebar() {
  const { projects, selectedProjectId, setSelectedProject, isPolling, lastSync, syncNow, isLoading } = useDashboardStore();

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <h1>📊 Finanz-Dashboard</h1>
        <p>Google Drive Analyzer</p>
      </div>

      <div style={{ padding: '12px 16px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="live-indicator">
          {isPolling && <span className="live-dot" />}
          <span>{isPolling ? 'Live-Sync' : 'Sync inaktiv'}</span>
        </div>
        <button
          className="btn btn-secondary"
          style={{ padding: '2px 8px', fontSize: '10px' }}
          onClick={syncNow}
          disabled={isLoading}
        >
          {isLoading ? '...' : 'Sync'}
        </button>
      </div>
      {lastSync && (
        <div style={{ padding: '0 16px 12px', fontSize: '9px', color: 'var(--text-muted)' }}>
          Letzter Sync: {lastSync.toLocaleTimeString()}
        </div>
      )}

      <div className="sidebar-nav">
        <div className="sidebar-section-title">Übersichten</div>
        <div
          className={`sidebar-item ${selectedProjectId === null ? 'active' : ''}`}
          onClick={() => setSelectedProject(null)}
        >
          <span>📁 Gesamt-Abgleich</span>
          <span className="sidebar-item-badge">{projects.length}</span>
        </div>

        <div className="sidebar-section-title" style={{ marginTop: '16px' }}>Projekte ({projects.length})</div>
        {projects.length === 0 ? (
          <div style={{ padding: '8px 12px', fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            Keine Projekte geladen
          </div>
        ) : (
          projects.map((project) => (
            <div
              key={project.id}
              className={`sidebar-item ${selectedProjectId === project.id ? 'active' : ''}`}
              onClick={() => setSelectedProject(project.id)}
            >
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <div>📁 {project.name}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{project.number}</div>
              </div>
              <span className={`sidebar-item-badge ${project.status}`}>
                {project.status === 'im_rahmen' ? 'OK' : '⚠'}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

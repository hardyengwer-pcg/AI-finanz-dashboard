import React from 'react';
import { useDashboardStore } from './store/dashboardStore';
import { requestDriveAccess, isAuthenticated, initGoogleAuth } from './services/googleDrive';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { OverviewDashboard } from './components/OverviewDashboard';
import { ProjectDetail } from './components/ProjectDetail';
import { Toaster, toast } from 'react-hot-toast';

// Set up mock data so that the dashboard functions beautifully out-of-the-box even without Drive auth
const MOCK_PROJECTS = [
  {
    id: 'mock-1',
    name: 'Dünnes Eis / MOSAiC Expedition',
    number: 'P10.309.074.00',
    location: 'Verkehrszentrum München, 500 m²',
    dateRange: 'Nov. 2024 – Dez. 2025',
    projectLead: 'Bettina Gundler & Daniela Menge',
    lastUpdated: '25.03.2026',
    status: 'im_rahmen' as const,
    budgetPlan: 150000,
    budgetIst: 114241,
    budgetYear: {
      '2024': { plan: 120000, ist: 100037 },
      '2025': { plan: 210000, ist: 14204 }
    },
    costTypes: [
      { name: 'Aufbau / Abbau / Umbau', amount: 74714, percentage: 65.4, color: '#3b82f6' },
      { name: 'Transport & Logistik', amount: 15101, percentage: 13.2, color: '#22c55e' },
      { name: 'Grafik & Druck', amount: 5545, percentage: 4.9, color: '#a855f7' },
      { name: 'Catering / Veranstaltung', amount: 4142, percentage: 3.6, color: '#f59e0b' },
      { name: 'Honorare / Externe', amount: 3499, percentage: 3.1, color: '#f97316' },
      { name: 'Leih- / Mietkosten', amount: 3081, percentage: 2.7, color: '#ec4899' },
      { name: 'Reisekosten / Gestaltung', amount: 3069, percentage: 2.7, color: '#06b6d4' },
      { name: 'Werbung / Marketing', amount: 2379, percentage: 2.1, color: '#84cc16' },
      { name: 'Material / Kleinstinvestitionen', amount: 2308, percentage: 2.0, color: '#eab308' },
      { name: 'Sonstiges (inkl. Gutschr.)', amount: 403, percentage: 0.4, color: '#64748b' }
    ],
    bookingMatches: {
      totalPositions: 279,
      vollMatch: 38,
      teilMatch: 33,
      klaerungsbedarf: 41,
      nurSage: 175,
      risikovolumen: 55115,
      topRisks: [
        { id: 'DAR.1450012349', amount: 15506, priority: 'kritisch' as const },
        { id: '0541/91285086', amount: 6521, priority: 'kritisch' as const },
        { id: 'DM-001-2024', amount: 5950, priority: 'kritisch' as const },
        { id: '26-02-015 (Split §13b)', amount: 3549, priority: 'hoch' as const },
        { id: '2023000129', amount: 2699, priority: 'hoch' as const }
      ],
      actionItems: []
    },
    aiAnalysis: {
      summary: 'Das Projekt läuft stabil im Rahmen des Gesamtbudgets. Die Gesamtauslastung liegt aktuell bei 76.2%. Es wurden jedoch einige Differenzen zwischen den geplanten Verträgen und den tatsächlich in Sage verbuchten Beträgen gefunden, die genauer abgeglichen werden sollten.',
      uncertainties: [
        { field: 'Kostenartenzuordnung', message: 'Bei 12 Buchungen konnte die Kostenart nicht eindeutig aus dem Verwendungszweck abgeleitet werden. Diese wurden automatisch unter "Sonstiges" einsortiert.', severity: 'medium' as const },
        { field: 'Währungsrisiko', message: 'Zwei Verträge aus den PDFs wurden in USD vereinbart, die Buchungen erfolgten jedoch in EUR. Wechselkursdifferenzen sind möglich.', severity: 'low' as const }
      ],
      confidence: 0.9,
      analyzedAt: new Date().toISOString()
    }
  }
];

const MOCK_ORDERS = [
  {
    id: 'order-1',
    projectId: 'mock-1',
    description: 'Messestand-Elemente Holzbau',
    supplier: 'Schreiner & Co.',
    amount: 12500,
    orderDate: '14.03.2026',
    status: 'bestellt' as const,
    costType: 'Aufbau / Abbau / Umbau',
    notes: 'Liefertermin KW 17 zugesagt'
  },
  {
    id: 'order-2',
    projectId: 'mock-1',
    description: 'Flyerdruck und Plakate',
    supplier: 'Flyeralarm',
    amount: 1450,
    orderDate: '20.03.2026',
    status: 'bestellt' as const,
    costType: 'Grafik & Druck',
    notes: 'Rechnung steht aus'
  }
];

export default function App() {
  const {
    projects,
    openOrders,
    selectedProjectId,
    startPolling,
    stopPolling
  } = useDashboardStore();

  // Load mocks and initialize Google Auth client
  React.useEffect(() => {
    useDashboardStore.setState({
      projects: MOCK_PROJECTS,
      openOrders: MOCK_ORDERS
    });
    
    // Initialize GIS Client and start polling if already authenticated
    initGoogleAuth().then(() => {
      if (isAuthenticated()) {
        startPolling();
      }
    });

    return () => {
      stopPolling();
    };
  }, [startPolling, stopPolling]);

  const handleLogin = async () => {
    const success = await requestDriveAccess();
    if (success) {
      toast.success('Erfolgreich mit Google Drive verbunden!');
      startPolling();
    } else {
      toast.error('Verbindung fehlgeschlagen (bitte Browser Pop-up erlauben).');
    }
  };

  const selectedProject = projects.find((p: any) => p.id === selectedProjectId);

  // Check if credentials are set up
  const hasCredentials = !!import.meta.env.VITE_GOOGLE_CLIENT_ID && import.meta.env.VITE_GOOGLE_CLIENT_ID !== 'your-client-id.apps.googleusercontent.com';

  return (
    <div className="app-layout">
      <Toaster position="top-right" />
      <Sidebar />
      <main className="main-content">
        <Header />
        <div className="main-body">
          {!hasCredentials && (
            <div className="no-api-banner">
              <span>ℹ️</span>
              <div>
                <strong>Sandbox-Modus:</strong> Keine Google Drive API Credentials gefunden. Die App zeigt Beispieldaten (Mockdaten) an.
                Erstelle eine <code>.env</code> Datei mit deinen Google Client-IDs, um Echtzeitdaten aus Drive zu synchronisieren.
              </div>
            </div>
          )}
          {isAuthenticated() ? (
            selectedProject ? (
              <ProjectDetail project={selectedProject} openOrders={openOrders} />
            ) : (
              <OverviewDashboard />
            )
          ) : (
            // Show either Google Login or Sandbox Mock UI
            selectedProject ? (
              <ProjectDetail project={selectedProject} openOrders={openOrders} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {!isAuthenticated() && hasCredentials && (
                  <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
                    <h3>Verbindung mit Google Drive</h3>
                    <p style={{ color: 'var(--text-secondary)', margin: '8px 0 16px' }}>
                      Logge dich mit deinem Google Workspace Account ein, um Projektanträge und Buchungslisten direkt zu laden.
                    </p>
                    <button className="btn btn-primary" onClick={handleLogin}>
                      🔑 Mit Google anmelden
                    </button>
                  </div>
                )}
                <OverviewDashboard />
              </div>
            )
          )}
        </div>
      </main>
    </div>
  );
}

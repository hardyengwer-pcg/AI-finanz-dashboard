import React, { useState } from 'react';
import { OpenOrder } from '../types/openOrder';
import { Project, isOrderForProject } from '../types/project';
import { useDashboardStore } from '../store/dashboardStore';

interface Props {
  orders: OpenOrder[];
  project: Project;
}

const STATUS_LABELS: Record<OpenOrder['status'], string> = {
  bestellt: '📦 Bestellt',
  geliefert: '✅ Geliefert',
  in_rechnung: '🧾 In Rechnung',
  storniert: '❌ Storniert',
};

const STATUS_COLORS: Record<OpenOrder['status'], string> = {
  bestellt: '#f59e0b',
  geliefert: '#22c55e',
  in_rechnung: '#3b82f6',
  storniert: '#6b7280',
};

export function OpenOrdersTable({ orders, project }: Props) {
  const { updateOpenOrder, addOpenOrder, deleteOpenOrder } = useDashboardStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newRow, setNewRow] = useState<Partial<OpenOrder> | null>(null);
  const [editData, setEditData] = useState<Partial<OpenOrder>>({});

  const filteredOrders = orders.filter((o) => isOrderForProject(o, project));

  const totalOpen = filteredOrders
    .filter((o) => o.status === 'bestellt' || o.status === 'geliefert')
    .reduce((s, o) => s + o.amount, 0);

  const startEdit = (order: OpenOrder) => {
    setEditingId(order.id);
    setEditData({ ...order });
  };

  const saveEdit = () => {
    if (editingId && editData) {
      updateOpenOrder(editData as OpenOrder);
      setEditingId(null);
      setEditData({});
    }
  };

  const startNewRow = () => {
    setNewRow({
      projectId: project.number || project.id || 'unbekannt',
      status: 'bestellt',
      orderDate: new Date().toLocaleDateString('de-DE'),
      description: '',
      supplier: '',
      amount: 0,
    });
  };

  const saveNewRow = () => {
    if (newRow?.description && newRow?.amount !== undefined) {
      addOpenOrder(newRow as Omit<OpenOrder, 'id'>);
      setNewRow(null);
    }
  };

  return (
    <div className="card">
      <div className="card-title" style={{ marginBottom: 12 }}>
        <span className="icon" style={{ background: '#f59e0b' }} />
        Offene Aufträge (noch nicht gebucht)
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', textTransform: 'none', letterSpacing: 0 }}>
            Gesamt offen: {totalOpen.toLocaleString('de-DE')} €
          </span>
          <button className="btn btn-primary" onClick={startNewRow} style={{ padding: '5px 12px' }}>
            + Hinzufügen
          </button>
        </div>
      </div>

      {filteredOrders.length === 0 && !newRow ? (
        <div className="empty-state" style={{ padding: '32px 0' }}>
          <div className="empty-state-icon">📋</div>
          <p>Keine offenen Aufträge eingetragen</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="orders-table">
            <thead>
              <tr>
                <th>Beschreibung</th>
                <th>Lieferant</th>
                <th>Kostenart</th>
                <th>Betrag</th>
                <th>Datum</th>
                <th>Status</th>
                <th>Notiz</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id}>
                  {editingId === order.id ? (
                    <>
                      <td><input value={editData.description || ''} onChange={(e) => setEditData({ ...editData, description: e.target.value })} /></td>
                      <td><input value={editData.supplier || ''} onChange={(e) => setEditData({ ...editData, supplier: e.target.value })} /></td>
                      <td><input value={editData.costType || ''} onChange={(e) => setEditData({ ...editData, costType: e.target.value })} /></td>
                      <td><input type="number" value={editData.amount || 0} onChange={(e) => setEditData({ ...editData, amount: parseFloat(e.target.value) || 0 })} /></td>
                      <td><input value={editData.orderDate || ''} onChange={(e) => setEditData({ ...editData, orderDate: e.target.value })} /></td>
                      <td>
                        <select value={editData.status || 'bestellt'} onChange={(e) => setEditData({ ...editData, status: e.target.value as OpenOrder['status'] })}>
                          {Object.entries(STATUS_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                          ))}
                        </select>
                      </td>
                      <td><input value={editData.notes || ''} onChange={(e) => setEditData({ ...editData, notes: e.target.value })} /></td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-success" style={{ padding: '3px 8px', fontSize: 11 }} onClick={saveEdit}>✓</button>
                          <button className="btn btn-secondary" style={{ padding: '3px 8px', fontSize: 11 }} onClick={() => setEditingId(null)}>✕</button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ fontWeight: 500, color: '#f1f5f9' }}>{order.description}</td>
                      <td>{order.supplier}</td>
                      <td style={{ color: '#64748b' }}>{order.costType || '–'}</td>
                      <td className="amount">{order.amount.toLocaleString('de-DE')} €</td>
                      <td style={{ color: '#64748b' }}>{order.orderDate}</td>
                      <td>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600,
                          background: STATUS_COLORS[order.status] + '20',
                          color: STATUS_COLORS[order.status],
                          border: `1px solid ${STATUS_COLORS[order.status]}40`,
                        }}>
                          {STATUS_LABELS[order.status]}
                        </span>
                      </td>
                      <td style={{ color: '#64748b', fontSize: 11 }}>{order.notes || '–'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-secondary" style={{ padding: '3px 8px', fontSize: 11 }} onClick={() => startEdit(order)}>✏️</button>
                          <button className="btn btn-danger" style={{ padding: '3px 8px', fontSize: 11 }} onClick={() => deleteOpenOrder(order.id)}>🗑️</button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}

              {newRow && (
                <tr style={{ background: 'rgba(59,130,246,0.05)' }}>
                  <td><input placeholder="Bezeichnung" value={newRow.description || ''} onChange={(e) => setNewRow({ ...newRow, description: e.target.value })} autoFocus /></td>
                  <td><input placeholder="Lieferant" value={newRow.supplier || ''} onChange={(e) => setNewRow({ ...newRow, supplier: e.target.value })} /></td>
                  <td><input placeholder="Kostenart" value={newRow.costType || ''} onChange={(e) => setNewRow({ ...newRow, costType: e.target.value })} /></td>
                  <td><input type="number" placeholder="0" value={newRow.amount || ''} onChange={(e) => setNewRow({ ...newRow, amount: parseFloat(e.target.value) || 0 })} /></td>
                  <td><input value={newRow.orderDate || ''} onChange={(e) => setNewRow({ ...newRow, orderDate: e.target.value })} /></td>
                  <td>
                    <select value={newRow.status || 'bestellt'} onChange={(e) => setNewRow({ ...newRow, status: e.target.value as OpenOrder['status'] })}>
                      {Object.entries(STATUS_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </td>
                  <td><input placeholder="Notiz" value={newRow.notes || ''} onChange={(e) => setNewRow({ ...newRow, notes: e.target.value })} /></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-success" style={{ padding: '3px 8px', fontSize: 11 }} onClick={saveNewRow}>✓</button>
                      <button className="btn btn-secondary" style={{ padding: '3px 8px', fontSize: 11 }} onClick={() => setNewRow(null)}>✕</button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

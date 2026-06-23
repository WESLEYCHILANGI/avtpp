import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import ActionMenu from '../../components/ActionMenu';

const CLASS_LABELS = {
  Class1_Motorcycle: { label: 'Class 1 — Motorcycle' },
  Class2_LightVehicle: { label: 'Class 2 — Light Vehicle' },
  Class3_Minibus: { label: 'Class 3 — Minibus' },
  Class4_HeavyBus: { label: 'Class 4 — Heavy Bus' },
  Class5_LightTruck: { label: 'Class 5 — Light Truck' },
  Class6_HeavyTruck: { label: 'Class 6 — Heavy Truck' },
};

export default function AdminTariffs() {
  const [tariffs, setTariffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editAmount, setEditAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [filterGate, setFilterGate] = useState('');

  const loadTariffs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/tariffs', true);
      setTariffs(res.data.tariffs);
    } catch (err) {
      console.error('Failed to load tariffs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTariffs(); }, [loadTariffs]);

  const startEdit = (tariff) => {
    setEditingId(tariff.TariffID);
    setEditAmount(String(tariff.Amount));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditAmount('');
  };

  const saveEdit = async (tariffId) => {
    const amount = parseFloat(editAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid positive amount.');
      return;
    }
    setSaving(true);
    try {
      await api.put(`/admin/tariffs/${tariffId}`, { amount }, true);
      setEditingId(null);
      loadTariffs();
    } catch {
      alert('Failed to update tariff.');
    } finally {
      setSaving(false);
    }
  };

  // Group tariffs by gate for display
  const gateNames = [...new Set(tariffs.map(t => t.GateName))].sort();

  const filteredTariffs = filterGate
    ? tariffs.filter(t => t.GateName === filterGate)
    : tariffs;

  // Group by gate name
  const grouped = {};
  filteredTariffs.forEach(t => {
    if (!grouped[t.GateName]) grouped[t.GateName] = [];
    grouped[t.GateName].push(t);
  });

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--gray-900)' }}>Tariff Rate Management</h2>
          <p style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>
            {tariffs.length} tariff{tariffs.length !== 1 ? 's' : ''} across {gateNames.length} gate{gateNames.length !== 1 ? 's' : ''}
          </p>
        </div>
        <select className="form-select" value={filterGate} onChange={(e) => setFilterGate(e.target.value)}
          style={{ minWidth: '220px', padding: '8px 12px', fontSize: '0.85rem' }}>
          <option value="">All Toll Gates</option>
          {gateNames.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      <div className="alert alert-info" style={{ marginBottom: '20px' }}>
        Tariff rates are in <strong>ZMW (Zambian Kwacha)</strong>. Click <strong>Edit</strong> on any rate to update the amount. Changes take effect immediately for new transactions.
      </div>

      {Object.entries(grouped).map(([gateName, gateTariffs]) => (
        <div className="card" key={gateName} style={{ marginBottom: '20px' }}>
          <div className="card-header">
            <h3 style={{ fontSize: '0.95rem' }}>{gateName}</h3>
            <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
              {gateTariffs[0]?.GateID ? `Gate #${gateTariffs[0].GateID}` : ''}
            </span>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Vehicle Class</th>
                    <th>Current Rate (ZMW)</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {gateTariffs.sort((a, b) => a.VehicleClass.localeCompare(b.VehicleClass)).map(t => {
                    const classInfo = CLASS_LABELS[t.VehicleClass] || { label: t.VehicleClass };
                    const isEditing = editingId === t.TariffID;

                    return (
                      <tr key={t.TariffID}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontWeight: 500 }}>{classInfo.label}</span>
                          </div>
                        </td>
                        <td>
                          {isEditing ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ color: 'var(--gray-500)', fontWeight: 600 }}>K</span>
                              <input
                                type="number"
                                className="form-input"
                                value={editAmount}
                                onChange={(e) => setEditAmount(e.target.value)}
                                min="0.01"
                                step="0.01"
                                style={{ width: '120px', padding: '6px 10px' }}
                                autoFocus
                              />
                            </div>
                          ) : (
                            <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--gray-900)' }}>
                              K{parseFloat(t.Amount).toFixed(2)}
                            </span>
                          )}
                        </td>
                        <td>
                          {isEditing ? (
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                className="btn btn-success btn-sm"
                                onClick={() => saveEdit(t.TariffID)}
                                disabled={saving}
                                style={{ fontSize: '0.72rem', padding: '4px 10px' }}
                              >
                                {saving ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                className="btn btn-outline btn-sm"
                                onClick={cancelEdit}
                                style={{ fontSize: '0.72rem', padding: '4px 10px' }}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <ActionMenu items={[
                              { label: 'Edit rate', onClick: () => startEdit(t) },
                            ]} />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ))}

      {Object.keys(grouped).length === 0 && (
        <div className="card">
          <div className="empty-state">
            <h3>No tariffs found</h3>
            <p>{filterGate ? `No tariffs for ${filterGate}.` : 'Add toll gates first to configure tariffs.'}</p>
          </div>
        </div>
      )}
    </div>
  );
}
